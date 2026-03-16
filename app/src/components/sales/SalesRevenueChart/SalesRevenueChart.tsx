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
import { XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { mockSalesRevenueData } from "./SalesRevenueChart.mock";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--color-chart-2)",
  },
  planned: {
    label: "Planned",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

export function SalesRevenueChart() {
  const isMobile = useIsMobile();
  const [timerange, setTimerange] = useState("90d");

  useEffect(() => {
    if (isMobile) {
      setTimerange("7d");
    }
  }, [isMobile]);

  const filteredData = useMemo(() => {
    return mockSalesRevenueData.filter((item) => {
      const date = new Date(item.date);
      const referenceDate = new Date("2024-03-19"); // Temporary, remove in prod
      const daysToSubstract = parseInt(timerange.split("d")[0]);

      const startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - daysToSubstract);
      return date >= startDate && date <= referenceDate;
    });
  }, [timerange]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sales Revenue Planning</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Daily sales revenue vs predicted sales revenue
          </span>
          <span className="@[540px]/card:hidden">Sales/day vs predicted</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timerange}
            onValueChange={setTimerange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
        <Select value={timerange} onValueChange={setTimerange}>
          <SelectTrigger
            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
            size="sm"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            data={filteredData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-planned)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-planned)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
            />
            <Area
              dataKey="planned"
              type="natural"
              fill="url(#fillPlanned)"
              stroke="var(--color-planned)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
