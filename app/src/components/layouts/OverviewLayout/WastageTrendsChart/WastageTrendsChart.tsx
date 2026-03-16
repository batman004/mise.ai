import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import type { SalesMetrics } from "@/services/sales";

const chartConfig = {
  high_wastage: {
    label: "High Wastage",
    color: "var(--color-chart-1)",
  },
  low_wastage: {
    label: "Low Wastage",
    color: "var(--color-chart-2)",
  },
  medium_wastage: {
    // For in-between items
    label: "Medium Wastage",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

export interface WastageTrendsChartProps {
  className?: string;
  wastageTrends?: SalesMetrics["wastageTrends"];
}

export function WastageTrendsChart({
  className,
  wastageTrends,
}: WastageTrendsChartProps) {
  const chartData = useMemo(() => {
    if (!wastageTrends) return [];

    const allItems = new Set([
      ...wastageTrends.highWastageItems.map((item) => item.menuItem),
      ...wastageTrends.lowWastageItems.map((item) => item.menuItem),
    ]);

    return Array.from(allItems)
      .map((menuItem) => {
        const highWastageItem = wastageTrends.highWastageItems.find(
          (item) => item.menuItem === menuItem
        );
        const lowWastageItem = wastageTrends.lowWastageItems.find(
          (item) => item.menuItem === menuItem
        );

        return {
          menu_item:
            menuItem.length > 15 ? menuItem.substring(0, 15) + "..." : menuItem,
          ...{
            medium_wastage:
              highWastageItem?.value && lowWastageItem?.value
                ? (highWastageItem.value + lowWastageItem.value) / 2
                : undefined,
            high_wastage:
              highWastageItem?.value && !lowWastageItem?.value
                ? highWastageItem.value
                : undefined,
            low_wastage:
              lowWastageItem?.value && !highWastageItem?.value
                ? lowWastageItem.value
                : undefined,
          },
        };
      })
      .slice(0, 10); // Limit to top 10 items for readability
  }, [wastageTrends]);

  if (!wastageTrends) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalHighWastage = wastageTrends.highWastageItems.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const totalLowWastage = wastageTrends.lowWastageItems.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const isHighWastageTrend = totalHighWastage > totalLowWastage;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isHighWastageTrend ? (
            <IconTrendingUp className="h-5 w-5 text-red-500" />
          ) : (
            <IconTrendingDown className="h-5 w-5 text-green-500" />
          )}
          Wastage Trends by Item
        </CardTitle>
        <CardDescription>High vs low wastage items comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <ComposedChart
            data={chartData}
            margin={{
              top: 8,
              right: -16,
              bottom: -16,
              left: -16,
            }}
          >
            <CartesianGrid vertical={false} strokeWidth={0.5} stroke="#bbb" />
            <XAxis
              dataKey="menu_item"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              textAnchor="middle"
              height={60}
              style={{
                fontSize: "0.75rem",
              }}
              tickFormatter={(value) =>
                value.length > 6 ? value.slice(0, 6) + "..." : value
              }
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => <b>{value}</b>}
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex justify-between items-center gap-2">
                      {value.toLocaleString()}
                      <span
                        className="italic"
                        style={{
                          color:
                            chartConfig[name as keyof typeof chartConfig].color,
                        }}
                      >
                        {(name as string)
                          .split("_")
                          .slice(0, 1)
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="high_wastage"
              fill="var(--color-chart-1)"
              radius={[4, 4, 0, 0]}
              name="high_wastage"
              stackId="a"
            />
            <Bar
              dataKey="low_wastage"
              fill="var(--color-chart-2)"
              radius={[4, 4, 0, 0]}
              name="low_wastage"
              stackId="a"
            />
            <Bar
              dataKey="medium_wastage"
              fill="var(--color-chart-3)"
              radius={[4, 4, 0, 0]}
              name="medium_wastage"
              stackId="a"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
