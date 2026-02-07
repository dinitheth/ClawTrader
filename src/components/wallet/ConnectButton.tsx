import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { monadTestnet } from '@/lib/wagmi';

export function ConnectButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
  });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
      });
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`${monadTestnet.blockExplorers.default.url}/address/${address}`, '_blank');
    }
  };

  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      toast({
        title: 'No Wallet Found',
        description: 'Please install MetaMask or another Web3 wallet',
        variant: 'destructive',
      });
    }
  };

  if (isConnecting || isConnectPending) {
    return (
      <Button disabled className="rounded-full h-10 px-5 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Connecting...</span>
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="rounded-full h-10 px-4 gap-2 border-border hover:bg-secondary">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="font-medium">{formatAddress(address)}</span>
            {balance && (
              <span className="text-muted-foreground text-sm hidden sm:inline">
                {(Number(balance.value) / Math.pow(10, balance.decimals)).toFixed(3)} {balance.symbol}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium">Connected Wallet</p>
            <p className="text-muted-foreground text-xs mt-0.5">{formatAddress(address)}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress} className="gap-2 cursor-pointer">
            <Copy className="w-4 h-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer} className="gap-2 cursor-pointer">
            <ExternalLink className="w-4 h-4" />
            View in Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => disconnect()} 
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      className="rounded-full h-10 px-5 gap-2"
    >
      <Wallet className="w-4 h-4" />
      <span className="hidden sm:inline">Connect</span>
    </Button>
  );
}
