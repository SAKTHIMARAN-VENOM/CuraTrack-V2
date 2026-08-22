'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ReactNode } from 'react';

export function HeartRateChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 w-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400">No recent heart rate data available from your wearable.</p>
            </div>
        );
    }

    const formatTime = (label: ReactNode) => {
        const date = new Date(String(label));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="time" 
                        tickFormatter={formatTime} 
                        tick={{fontSize: 10, fill: '#717786', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={30}
                    />
                    <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']} 
                        tick={{fontSize: 10, fill: '#717786', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={formatTime}
                        formatter={(value, name) => [value, 'BPM']}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="bpm" 
                        stroke="#ba1a1a" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorBpm)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
