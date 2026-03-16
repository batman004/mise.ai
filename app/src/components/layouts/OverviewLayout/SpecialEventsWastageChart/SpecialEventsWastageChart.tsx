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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { IconCalendarEvent } from "@tabler/icons-react";
import { type SalesMetrics, SpecialEvent } from "@/services/sales";

const chartConfig = {
  wastage: {
    label: "Wastage",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export interface SpecialEventsWastageChartProps {
  className?: string;
  specialEventsWastage?: SalesMetrics["specialEventWastage"];
}

export function SpecialEventsWastageChart({
  className,
  specialEventsWastage,
}: SpecialEventsWastageChartProps) {
  const chartData = useMemo(() => {
    console.log("specialEventsWastage", specialEventsWastage);
    if (!specialEventsWastage) return [];

    return Object.entries(specialEventsWastage.totalWastageBySpecialEvent)
      .filter(([event]) => event !== SpecialEvent.NONE)
      .map(([event, wastage]) => ({
        event: event
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        wastage,
      }))
      .filter((item) => item.wastage > 0)
      .sort((a, b) => b.wastage - a.wastage);
  }, [specialEventsWastage]);

  if (!specialEventsWastage) {
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

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendarEvent className="h-5 w-5" />
          Special Events Wastage
        </CardTitle>
        <CardDescription>Wastage during special events</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <BarChart
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
              dataKey="event"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={0}
              textAnchor="middle"
              height={60}
              tickFormatter={(value) =>
                value.length > 6 ? value.slice(0, 6) + "..." : value
              }
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => <b>{value}</b>}
                  indicator="dot"
                  formatter={(value) => value.toLocaleString()}
                />
              }
            />
            <Bar
              dataKey="wastage"
              fill="var(--color-chart-6)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
