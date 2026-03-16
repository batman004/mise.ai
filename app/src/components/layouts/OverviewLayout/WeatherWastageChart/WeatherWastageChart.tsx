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
import { PieChart, Pie, Cell, Legend } from "recharts";
import { IconCloudRain } from "@tabler/icons-react";
import {
  WeatherCondition,
  WeatherConditionIcons,
  WeatherConditionNames,
  type SalesMetrics,
} from "@/services/sales";
import { WeatherChartLegend } from "./WeatherChartLegend";

// Explicitly map weather conditions to chart colors to prevent tree-shaking
const weatherColorMap: Record<WeatherCondition, string> = {
  [WeatherCondition.CLEAR]: "var(--color-chart-1)",
  [WeatherCondition.SUNNY]: "var(--color-chart-2)",
  [WeatherCondition.RAINY]: "var(--color-chart-3)",
  [WeatherCondition.CLOUDY]: "var(--color-chart-4)",
};

const chartConfig = Object.fromEntries(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Object.entries(WeatherCondition).map(([_, value]) => [
    value,
    {
      label: WeatherConditionNames[value],
      color: weatherColorMap[value],
    },
  ])
) satisfies ChartConfig;

export interface WeatherWastageChartProps {
  className?: string;
  weatherWastage?: SalesMetrics["weatherConditionWastage"];
}

export function WeatherWastageChart({
  className,
  weatherWastage,
}: WeatherWastageChartProps) {
  const chartData = useMemo(() => {
    if (!weatherWastage) return [];

    return Object.entries(weatherWastage.totalWastageByWeather)
      .map(([weather, wastage]) => ({
        weather: weather as WeatherCondition,
        wastage,
        fill:
          chartConfig[weather as WeatherCondition]?.color ||
          "var(--color-chart-2)",
      }))
      .filter((item) => item.wastage > 0);
  }, [weatherWastage]);

  if (!weatherWastage) {
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

  const totalWastage = chartData.reduce((sum, item) => sum + item.wastage, 0);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCloudRain className="h-5 w-5" />
          Weather Wastage Distribution
        </CardTitle>
        <CardDescription>Total wastage by weather condition</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="wastage"
              nameKey="weather"
              cx="50%"
              cy="50%"
              outerRadius={60}
              innerRadius={30}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend content={WeatherChartLegend} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex flex-col gap-1">
                      <div
                        className="text-sm flex items-center gap-0.5 font-bold"
                        style={{
                          color:
                            chartConfig[name as keyof typeof chartConfig].color,
                        }}
                      >
                        {(() => {
                          const WeatherIcon =
                            WeatherConditionIcons[name as WeatherCondition];
                          return <WeatherIcon className="size-4" />;
                        })()}
                        {WeatherConditionNames[name as WeatherCondition]}
                      </div>
                      <span>
                        {value.toLocaleString()} (
                        {((Number(value) / totalWastage) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
