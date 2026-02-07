/**
 * Centralized error handling utilities for ClawTrader
 */

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  FAUCET_COOLDOWN = 'FAUCET_COOLDOWN',
  FAUCET_UNAVAILABLE = 'FAUCET_UNAVAILABLE',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  retry?: boolean;
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ErrorCode.WALLET_CONNECTION_FAILED]: 'Failed to connect wallet. Please try again.',
  [ErrorCode.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
  [ErrorCode.CONTRACT_ERROR]: 'Smart contract interaction failed.',
  [ErrorCode.FAUCET_COOLDOWN]: 'Please wait for the cooldown period to end.',
  [ErrorCode.FAUCET_UNAVAILABLE]: 'Faucet is temporarily unavailable. Please try again later.',
  [ErrorCode.INVALID_ADDRESS]: 'Invalid wallet address provided.',
  [ErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance for this operation.',
  [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found.',
  [ErrorCode.MATCH_NOT_FOUND]: 'Match not found.',
  [ErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please slow down.',
  [ErrorCode.SERVER_ERROR]: 'Server error occurred. Please try again later.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
};

/**
 * Creates a standardized application error
 */
export function createError(
  code: ErrorCode,
  details?: string,
  retry = true
): AppError {
  return {
    code,
    message: ERROR_MESSAGES[code],
    details,
    retry,
  };
}

/**
 * Parses various error types into a standardized AppError
 */
export function parseError(error: unknown): AppError {
  // Handle string errors
  if (typeof error === 'string') {
    return createError(ErrorCode.UNKNOWN_ERROR, error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return createError(ErrorCode.NETWORK_ERROR, error.message);
    }

    // Wallet errors
    if (message.includes('wallet') || message.includes('rejected') || message.includes('user denied')) {
      return createError(ErrorCode.WALLET_CONNECTION_FAILED, error.message, false);
    }

    // Transaction errors
    if (message.includes('transaction') || message.includes('execution reverted')) {
      return createError(ErrorCode.TRANSACTION_FAILED, error.message);
    }

    // Rate limiting
    if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
      return createError(ErrorCode.RATE_LIMITED, error.message, true);
    }

    // Insufficient funds
    if (message.includes('insufficient') || message.includes('balance')) {
      return createError(ErrorCode.INSUFFICIENT_BALANCE, error.message, false);
    }

    return createError(ErrorCode.UNKNOWN_ERROR, error.message);
  }

  // Handle objects with error-like properties
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    if ('code' in err && typeof err.code === 'string') {
      const code = err.code as string;
      
      // Handle specific error codes from APIs
      if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
        return createError(ErrorCode.NETWORK_ERROR);
      }
    }

    if ('message' in err && typeof err.message === 'string') {
      return parseError(new Error(err.message));
    }
  }

  return createError(ErrorCode.UNKNOWN_ERROR);
}

/**
 * Validates an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Formats an error for user display
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  description: string;
} {
  return {
    title: getErrorTitle(error.code),
    description: error.details || error.message,
  };
}

function getErrorTitle(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.NETWORK_ERROR:
      return 'Connection Error';
    case ErrorCode.WALLET_CONNECTION_FAILED:
      return 'Wallet Error';
    case ErrorCode.TRANSACTION_FAILED:
      return 'Transaction Failed';
    case ErrorCode.CONTRACT_ERROR:
      return 'Contract Error';
    case ErrorCode.FAUCET_COOLDOWN:
      return 'Cooldown Active';
    case ErrorCode.FAUCET_UNAVAILABLE:
      return 'Faucet Unavailable';
    case ErrorCode.INVALID_ADDRESS:
      return 'Invalid Address';
    case ErrorCode.INSUFFICIENT_BALANCE:
      return 'Insufficient Balance';
    case ErrorCode.AGENT_NOT_FOUND:
      return 'Agent Not Found';
    case ErrorCode.MATCH_NOT_FOUND:
      return 'Match Not Found';
    case ErrorCode.UNAUTHORIZED:
      return 'Unauthorized';
    case ErrorCode.RATE_LIMITED:
      return 'Rate Limited';
    case ErrorCode.SERVER_ERROR:
      return 'Server Error';
    default:
      return 'Error';
  }
}

/**
 * Async wrapper with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = parseError(error);
    onError?.(appError);
    return null;
  }
}
