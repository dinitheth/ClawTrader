import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface ServerHealth {
    status: 'online' | 'offline';
    timestamp?: string;
    uptime?: number;
}

const SERVER_URLS = {
    trading: import.meta.env.VITE_TRADING_SERVER_URL || 'http://96.30.205.215:3001',
    settlement: import.meta.env.VITE_SETTLEMENT_SERVER_URL || 'http://96.30.205.215:3002'
};

export function ServerStatus() {
    const [tradingStatus, setTradingStatus] = useState<ServerHealth>({ status: 'offline' });
    const [settlementStatus, setSettlementStatus] = useState<ServerHealth>({ status: 'offline' });

    const checkHealth = async (url: string): Promise<ServerHealth> => {
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                return { status: 'online', timestamp: data.timestamp, uptime: data.uptime };
            }
            return { status: 'offline' };
        } catch (error) {
            return { status: 'offline' };
        }
    };

    const checkAllServers = async () => {
        const [trading, settlement] = await Promise.all([
            checkHealth(SERVER_URLS.trading),
            checkHealth(SERVER_URLS.settlement)
        ]);

        setTradingStatus(trading);
        setSettlementStatus(settlement);
    };

    useEffect(() => {
        // Initial check
        checkAllServers();

        // Poll every 30 seconds
        const interval = setInterval(checkAllServers, 30000);

        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds?: number) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="flex items-center gap-3">
            {/* Trading Server */}
            <div className="group relative">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors">
                    <div className={`w-2 h-2 rounded-full ${tradingStatus.status === 'online'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-red-500'
                        }`} />
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="text-xs space-y-1">
                        <div className="font-semibold text-foreground">Trading Server</div>
                        <div className="text-muted-foreground">
                            Status: <span className={tradingStatus.status === 'online' ? 'text-green-500' : 'text-red-500'}>
                                {tradingStatus.status}
                            </span>
                        </div>
                        {tradingStatus.uptime && (
                            <div className="text-muted-foreground">
                                Uptime: {formatUptime(tradingStatus.uptime)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Settlement Server */}
            <div className="group relative">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors">
                    <div className={`w-2 h-2 rounded-full ${settlementStatus.status === 'online'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-red-500'
                        }`} />
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="text-xs space-y-1">
                        <div className="font-semibold text-foreground">Settlement Server</div>
                        <div className="text-muted-foreground">
                            Status: <span className={settlementStatus.status === 'online' ? 'text-green-500' : 'text-red-500'}>
                                {settlementStatus.status}
                            </span>
                        </div>
                        {settlementStatus.uptime && (
                            <div className="text-muted-foreground">
                                Uptime: {formatUptime(settlementStatus.uptime)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
