import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import {
  IconArrowDown,
  IconArrowUp,
  IconCurrencyDollar,
  IconLineDashed,
  IconChartBar,
} from "@tabler/icons-react";
import type { SalesMetrics } from "@/services/sales";
import { cn } from "@/lib/utils";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--color-chart-2)",
  },
  growth_rate: {
    label: "Growth Rate",
    color: "var(--color-chart-8)",
  },
} satisfies ChartConfig;

export interface MonthlySalesChartProps {
  className?: string;
  revenue: SalesMetrics["revenueByMonth"];
}

export function MonthlySalesChart({
  className,
  revenue,
}: MonthlySalesChartProps) {
  const isMobile = useIsMobile();
  const [timerange, setTimerange] = useState("12m");

  useEffect(() => {
    if (isMobile) {
      setTimerange("6m");
    }
  }, [isMobile]);

  /*
  const since = useMemo(() => {
    const months = parseInt(timerange.split("m")[0]);
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }, [timerange]);
  */

  const processedMetrics = useMemo(() => {
    if (!revenue || !Array.isArray(revenue) || revenue.length === 0) return [];
    
    // Mock today date as data is not continuous for now, aim for today to be the last month of our data
    const MOCKED_TODAY = new Date(revenue[revenue.length - 1].month)

    // Get the current date and calculate the range
    const monthsRange = parseInt(timerange.split("m")[0]);
    const currentDate = new Date(MOCKED_TODAY);
    const startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - monthsRange);

    // Refactor monthly sales
    const monthlyData = revenue.reduce(
      (acc, curr) => {
        const month = curr.month;
        const monthDate = new Date(month + "-01"); // Convert "2024-02" to "2024-02-01"

        // Check if month is within the selected range
        if (monthDate >= startDate && monthDate <= currentDate) {
          const revenue = curr.revenue;

          if (!acc[month]) {
            acc[month] = { month, revenue, growth_rate: 0 };
          } else {
            acc[month].revenue += revenue;
          }
        }

        return acc;
      },
      {} as Record<
        string,
        { month: string; revenue: number; growth_rate: number }
      >,
    );

    const monthlyRevenueArray = Object.values(monthlyData).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
    );

    for (let i = 1; i < monthlyRevenueArray.length; i++) {
      const currentMonth = monthlyRevenueArray[i];
      const previousMonth = monthlyRevenueArray[i - 1];

      const growthRate =
        previousMonth.revenue === 0
          ? 0
          : ((currentMonth.revenue - previousMonth.revenue) /
              previousMonth.revenue) *
            100;

      monthlyData[currentMonth.month].growth_rate =
        Math.round(growthRate * 100) / 100; // Round to 2 decimal places
    }

    return Object.values(monthlyData);
  }, [revenue, timerange]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconChartBar className="h-5 w-5" />
          Monthly Sales
        </CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Monthly revenue and quantity sold overview
          </span>
          <span className="@[540px]/card:hidden">Monthly sales overview</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timerange}
            onValueChange={setTimerange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="12m">Last 12 months</ToggleGroupItem>
            <ToggleGroupItem value="6m">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="3m">Last 3 months</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timerange} onValueChange={setTimerange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 12 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12m" className="rounded-lg">
                Last 12 months
              </SelectItem>
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <ComposedChart accessibilityLayer data={processedMetrics}>
            <CartesianGrid vertical={false} strokeWidth={0.5} stroke="#bbb" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              textAnchor="middle"
              height={60}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                });
              }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Legend
              formatter={(value) =>
                value
                  .split("_")
                  .map(
                    (item: string) =>
                      item.charAt(0).toUpperCase() + item.slice(1),
                  )
                  .join(" ")
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return (
                      <b>
                        {date.toLocaleDateString("en-US", {
                          month: "long",
                        })}
                      </b>
                    );
                  }}
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex justify-between items-center gap-2">
                      {name === "revenue" && (
                        <>
                          <span className="text-muted-foreground">Revenue</span>
                          <div className="flex items-center text-teal-600">
                            <IconCurrencyDollar className="size-4" />
                            {value.toLocaleString()}
                          </div>
                        </>
                      )}
                      {name === "growth_rate" && (
                        <>
                          <span className="text-muted-foreground">
                            Growth Rate
                          </span>
                          <div
                            className={cn(
                              "flex items-center",
                              Number(value) === 0
                                ? "text-gray-600"
                                : Number(value) > 0
                                  ? "text-green-600"
                                  : "text-red-600",
                            )}
                          >
                            {Number(value) === 0 ? (
                              <IconLineDashed className="size-4" />
                            ) : Number(value) > 0 ? (
                              <IconArrowUp className="size-4" />
                            ) : (
                              <IconArrowDown className="size-4" />
                            )}
                            {value.toLocaleString()}%
                          </div>
                        </>
                      )}
                    </div>
                  )}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              fill="var(--color-chart-2)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              dataKey="growth_rate"
              type="monotone"
              stroke="var(--color-chart-8)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
