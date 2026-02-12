import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, ExternalLink } from 'lucide-react';

interface Trade {
    id: string;
    action: 'BUY' | 'SELL';
    symbol: string;
    amount: number;
    price: number;
    timestamp: string;
    pnl?: number;
    txHash?: string;
}

interface RecentTradesProps {
    trades: Trade[];
    tradePnLMap?: { [tradeId: string]: number };
}

export function RecentTrades({ trades, tradePnLMap = {} }: RecentTradesProps) {
    if (trades.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2 md:pb-3">
                    <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                        Recent Trades
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6 md:py-8 text-muted-foreground">
                        <BarChart3 className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm md:text-base">No trades yet</p>
                        <p className="text-xs md:text-sm">Start auto trading to see activity</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
                    Recent Trades
                    <span className="text-muted-foreground font-normal">({trades.length})</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto">
                    {trades.slice(0, 10).map((trade) => {
                        // Professional exchange colors (Binance/Coinbase style)
                        const isBuy = trade.action === 'BUY';
                        const tradeColor = isBuy ? '#16c784' : '#ea3943'; // Green for BUY, Red for SELL
                        const bgColor = isBuy ? 'rgba(22, 199, 132, 0.1)' : 'rgba(234, 57, 67, 0.1)';
                        // Use calculated PnL from map, fallback to trade.pnl
                        const pnlValue = tradePnLMap[trade.id] ?? trade.pnl ?? 0;

                        return (
                            <div
                                key={trade.id}
                                className="flex items-center justify-between p-2 md:p-3 rounded-lg transition-all hover:scale-[1.01]"
                                style={{
                                    backgroundColor: bgColor,
                                    borderLeft: `3px solid ${tradeColor}`,
                                }}
                            >
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div
                                        className="p-1.5 md:p-2 rounded-full"
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {isBuy ? (
                                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4" style={{ color: tradeColor }} />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 md:w-4 md:h-4" style={{ color: tradeColor }} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-bold text-xs md:text-sm"
                                                style={{ color: tradeColor }}
                                            >
                                                {trade.action}
                                            </span>
                                            <span className="text-xs md:text-sm font-medium">{trade.symbol}</span>
                                            {trade.txHash && (
                                                <a
                                                    href={`https://testnet.monadexplorer.com/tx/${trade.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-[10px] md:text-xs text-muted-foreground">
                                            {new Date(trade.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-xs md:text-sm font-medium">{trade.amount.toFixed(2)} USDC</p>
                                    {isBuy ? (
                                        <p className="text-xs md:text-sm text-muted-foreground italic">
                                            Unrealized
                                        </p>
                                    ) : (
                                        <p
                                            className="text-xs md:text-sm font-mono font-bold"
                                            style={{ color: pnlValue >= 0 ? '#16c784' : '#ea3943' }}
                                        >
                                            {pnlValue >= 0 ? '+' : ''}{pnlValue.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
