"use client";

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { cn, formatCurrency } from "@/lib/utils";

type DataPoint = {
  month: string;
  recurring: number;
  oneOff: number;
};

const defaultData: DataPoint[] = [
  { month: "Jan", recurring: 3200, oneOff: 1800 },
  { month: "Feb", recurring: 3600, oneOff: 2200 },
  { month: "Mar", recurring: 4100, oneOff: 1500 },
  { month: "Apr", recurring: 4800, oneOff: 2400 },
  { month: "May", recurring: 5300, oneOff: 2600 },
  { month: "Jun", recurring: 5800, oneOff: 2000 },
];

export function RevenueChart({
  data = defaultData,
  className,
}: {
  data?: DataPoint[];
  className?: string;
}) {
  return (
    <div className={cn("h-[260px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRecurring" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorOneOff" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            axisLine={false}
            tickLine={false}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => formatCurrency(Number(value)).replace(/\.00$/, "")}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            content={({ label, payload }) => {
              if (!payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-popover px-4 py-2 text-sm shadow-sm">
                  <p className="font-medium">{label}</p>
                  {payload.map((item) => (
                    <p key={item.dataKey?.toString()} className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: item.color ?? "" }}
                      />
                      <span className="capitalize">{item.name}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(Number(item.value ?? 0))}
                      </span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="recurring"
            name="Recurring"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#colorRecurring)"
          />
          <Area
            type="monotone"
            dataKey="oneOff"
            name="One-off"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill="url(#colorOneOff)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
