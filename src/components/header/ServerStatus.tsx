import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface ServerHealth {
    status: 'online' | 'offline' | 'not-configured';
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
        // If we're on HTTPS and the server URL is HTTP, the browser will block it (mixed content)
        // Show "not-configured" instead of false "offline"
        const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const isHttpUrl = url.startsWith('http://');
        if (isHttpsPage && isHttpUrl) {
            return { status: 'not-configured' };
        }

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500 animate-pulse';
            case 'not-configured': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-500';
            case 'not-configured': return 'text-yellow-500';
            default: return 'text-red-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'online': return 'online';
            case 'not-configured': return 'requires HTTPS backend';
            default: return 'offline';
        }
    };

    return (
        <div className="flex items-center gap-3">
            {/* Trading Server */}
            <div className="group relative">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(tradingStatus.status)}`} />
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="text-xs space-y-1">
                        <div className="font-semibold text-foreground">Trading Server</div>
                        <div className="text-muted-foreground">
                            Status: <span className={getStatusTextColor(tradingStatus.status)}>
                                {getStatusLabel(tradingStatus.status)}
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
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(settlementStatus.status)}`} />
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="text-xs space-y-1">
                        <div className="font-semibold text-foreground">Settlement Server</div>
                        <div className="text-muted-foreground">
                            Status: <span className={getStatusTextColor(settlementStatus.status)}>
                                {getStatusLabel(settlementStatus.status)}
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
