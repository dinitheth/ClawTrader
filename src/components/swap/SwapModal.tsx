import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowDown, Loader2, Check, AlertTriangle, Wallet, RefreshCw } from "lucide-react";
import { useAccount } from 'wagmi';
import { useClawSwap } from '@/hooks/useClawSwap';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SwapModal = ({ isOpen, onClose }: SwapModalProps) => {
    const { isConnected } = useAccount();
    const {
        usdcBalance,
        clawBalance,
        swapState,
        isConfirming,
        isContractDeployed,
        SWAP_RATE,
        previewSwap,
        executeSwap,
        reset,
        refetchBalances,
    } = useClawSwap();

    const [usdcInput, setUsdcInput] = useState<string>('');
    const usdcAmount = Number(usdcInput) || 0;
    const clawOutput = previewSwap(usdcAmount);

    // Reset state when modal opens
    const prevOpen = useRef(false);
    if (isOpen && !prevOpen.current) {
        prevOpen.current = true;
        reset();
        setUsdcInput('');
        refetchBalances();
    } else if (!isOpen && prevOpen.current) {
        prevOpen.current = false;
    }

    if (!isOpen) return null;

    const canSwap = isConnected && isContractDeployed && usdcAmount > 0 && usdcAmount <= usdcBalance && swapState.step === 'idle';
    const isProcessing = swapState.step === 'approving' || swapState.step === 'swapping' || isConfirming;

    const handleSwap = async () => {
        try {
            await executeSwap(usdcAmount);
        } catch {
            // error handled in hook
        }
    };

    const setPercentage = (pct: number) => {
        const amount = Math.floor(usdcBalance * pct * 100) / 100;
        setUsdcInput(amount.toString());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        <h2 className="font-display font-bold text-lg">Swap</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Rate Display */}
                    <div className="text-center py-2 px-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs text-muted-foreground">Exchange Rate</p>
                        <p className="text-lg font-bold font-mono text-primary">1 USDC = {SWAP_RATE} $CLAW</p>
                    </div>

                    {/* From: USDC */}
                    <div className="rounded-xl border border-border bg-muted/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-muted-foreground">You Pay</label>
                            <span className="text-[11px] text-muted-foreground">
                                Balance: <span className="font-mono text-foreground">{usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> USDC
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={usdcInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setUsdcInput(val);
                                    }
                                }}
                                className="flex-1 bg-transparent text-2xl font-mono font-bold outline-none border-none text-foreground placeholder:text-muted-foreground"
                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                                disabled={isProcessing}
                            />
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border flex-shrink-0">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-white">$</span>
                                </div>
                                <span className="text-sm font-semibold">USDC</span>
                            </div>
                        </div>
                        {/* Quick percentage buttons */}
                        <div className="flex items-center gap-2 mt-3">
                            {[0.25, 0.5, 0.75, 1].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => setPercentage(pct)}
                                    className="flex-1 py-1 text-[10px] font-medium rounded-md bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isProcessing}
                                >
                                    {pct === 1 ? 'MAX' : `${pct * 100}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-1">
                        <div className="w-9 h-9 rounded-full bg-muted/30 border border-border flex items-center justify-center">
                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>

                    {/* To: CLAW */}
                    <div className="rounded-xl border border-border bg-muted/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-muted-foreground">You Receive</label>
                            <span className="text-[11px] text-muted-foreground">
                                Balance: <span className="font-mono text-foreground">{clawBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> CLAW
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-mono font-bold text-primary flex-1">
                                {clawOutput > 0 ? clawOutput.toLocaleString() : '0'}
                            </p>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border flex-shrink-0">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-white">🦀</span>
                                </div>
                                <span className="text-sm font-semibold">CLAW</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Messages */}
                    {!isConnected && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs">
                            <Wallet className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="text-yellow-400">Connect your wallet to swap</span>
                        </div>
                    )}

                    {!isContractDeployed && isConnected && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="text-yellow-400">Swap contract not deployed yet. Deploy ClawSwap first.</span>
                        </div>
                    )}

                    {usdcAmount > usdcBalance && usdcAmount > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-red-400">Insufficient USDC balance</span>
                        </div>
                    )}

                    {swapState.step === 'success' && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-400 font-medium">Swap successful!</span>
                        </div>
                    )}

                    {swapState.step === 'error' && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-red-400">{swapState.error}</span>
                        </div>
                    )}

                    {/* Swap Button */}
                    <Button
                        className="w-full h-12 text-base font-semibold"
                        disabled={!canSwap && !isProcessing}
                        onClick={swapState.step === 'success' ? () => { reset(); setUsdcInput(''); } : handleSwap}
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {swapState.step === 'approving' ? 'Approving USDC...' : 'Swapping...'}
                            </span>
                        ) : swapState.step === 'success' ? (
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Swap Again
                            </span>
                        ) : !isConnected ? (
                            'Connect Wallet'
                        ) : !isContractDeployed ? (
                            'Contract Not Deployed'
                        ) : usdcAmount <= 0 ? (
                            'Enter Amount'
                        ) : usdcAmount > usdcBalance ? (
                            'Insufficient USDC'
                        ) : (
                            'Swap'
                        )}
                    </Button>

                    {/* Info Footer */}
                    <div className="grid grid-cols-2 gap-3 text-center pt-2">
                        <div className="p-2 rounded-lg bg-muted/10">
                            <p className="text-[10px] text-muted-foreground">Rate</p>
                            <p className="text-xs font-mono font-medium">1:100</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/10">
                            <p className="text-[10px] text-muted-foreground">Network</p>
                            <p className="text-xs font-medium">Monad Testnet</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwapModal;
