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
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { IconChefHat, IconRefresh, IconBolt } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import {
  usePredictionResults,
  useCreatePrediction,
  useCreateImmediatePrediction,
  PredictionStatus,
} from "@/services/predictions";
import {
  getNextWeekStart,
  getNextMonthStart,
} from "@/services/sales/sales.utils";
import type { Sale } from "@/services/sales";

export interface MenuPredictionChartProps {
  className?: string;
  userId?: number;
  sales?: Sale[];
}

export function MenuPredictionChart({
  className,
  userId = 1,
  sales = [],
}: MenuPredictionChartProps) {
  const { user } = useAuth();
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [isWeeklyPrediction, setIsWeeklyPrediction] = useState(false);

  // Dynamic chart config based on timeframe
  const chartConfig = {
    recommended: {
      label: "Recommended Order Qty",
      color: "var(--color-chart-1)",
    },
    comparisonPeriod: {
      label: isWeeklyPrediction
        ? "Previous Week Sales"
        : "Previous Month Sales",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  // Prediction mutation hooks
  const createPrediction = useCreatePrediction({
    onSuccess: () => {
      console.log("Prediction created successfully");
    },
    onError: (error) => {
      console.error("Failed to create prediction:", error);
    },
  });

  const createImmediatePrediction = useCreateImmediatePrediction({
    onSuccess: () => {
      console.log("Immediate prediction created successfully");
    },
    onError: (error) => {
      console.error("Failed to create immediate prediction:", error);
    },
  });

  // Fetch prediction results
  const {
    predictions,
    isLoading: predictionsLoading,
    error: predictionsError,
  } = usePredictionResults(
    {
      user_id: userId.toString(),
      limit: 100,
    },
    {
      enabled: true,
      // Poll every 2 seconds when no predictions are available
      refetchInterval: 2000,
    }
  );

  // Handle toggle change
  const handleToggleChange = (value: string) => {
    const newIsWeekly = value === "weekly";
    setIsWeeklyPrediction(newIsWeekly);

    // Automatically create a new prediction when toggle changes
    const predictionDate = newIsWeekly
      ? getNextWeekStart(sales)
      : getNextMonthStart(sales);

    createPrediction.mutate({
      date: predictionDate,
      userId: user?.id,
    });
  };

  // Handle refresh button click
  const handleRefresh = (event: React.MouseEvent) => {
    const isImmediate = event.shiftKey;

    // Calculate prediction date based on timeframe selection
    const predictionDate = isWeeklyPrediction
      ? getNextWeekStart(sales) // Next week if weekly
      : getNextMonthStart(sales); // Next month if monthly

    if (isImmediate) {
      createImmediatePrediction.mutate({
        date: predictionDate,
        userId: user?.id,
      });
    } else {
      createPrediction.mutate({
        date: predictionDate,
        userId: user?.id,
      });
    }
  };

  const isRefreshing =
    createPrediction.isPending || createImmediatePrediction.isPending;

  // Handle Shift key detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Process prediction data for chart
  const chartData = useMemo(() => {
    if (
      !predictions ||
      predictions.length === 0 ||
      !sales ||
      sales.length === 0
    )
      return [];

    // Get the most recent completed prediction
    const completedPredictions = predictions.filter(
      (p) =>
        p.status === PredictionStatus.COMPLETED && p.predictionData.length > 0
    );

    const latestPrediction = completedPredictions.sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )[0];

    if (!latestPrediction) return [];

    // Calculate comparison period based on timeframe selection
    const lastSaleDate = new Date(sales[sales.length - 1].date);
    let comparisonStartDate: Date;
    let comparisonEndDate: Date;

    if (isWeeklyPrediction) {
      // For weekly predictions, compare against previous week
      const lastWeekStart = new Date(lastSaleDate);
      const day = lastWeekStart.getDay();
      const diff = lastWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
      lastWeekStart.setDate(diff);
      lastWeekStart.setHours(0, 0, 0, 0);

      comparisonEndDate = new Date(lastWeekStart);
      comparisonEndDate.setDate(comparisonEndDate.getDate() - 1); // End of previous week

      comparisonStartDate = new Date(comparisonEndDate);
      comparisonStartDate.setDate(comparisonStartDate.getDate() - 6); // Start of previous week
    } else {
      // For monthly predictions, compare against previous month
      comparisonEndDate = new Date(lastSaleDate);
      comparisonEndDate.setMonth(comparisonEndDate.getMonth() - 1);
      comparisonEndDate.setDate(
        new Date(
          comparisonEndDate.getFullYear(),
          comparisonEndDate.getMonth() + 1,
          0
        ).getDate()
      ); // Last day of previous month

      comparisonStartDate = new Date(comparisonEndDate);
      comparisonStartDate.setDate(1); // First day of previous month
    }

    // Group sales by menu item for the comparison period
    const comparisonSales = new Map<string, number>();
    sales.forEach((sale) => {
      const saleDate = new Date(sale.date);
      if (saleDate >= comparisonStartDate && saleDate <= comparisonEndDate) {
        const existing = comparisonSales.get(sale.menuItem) || 0;
        comparisonSales.set(sale.menuItem, existing + sale.quantitySold);
      }
    });

    // Group prediction data by menu item
    const menuItemData = new Map<
      string,
      { recommended: number; comparisonPeriod: number }
    >();

    latestPrediction.predictionData.forEach((item) => {
      const existing = menuItemData.get(item.menuItem) || {
        recommended: 0,
        comparisonPeriod: 0,
      };
      const comparisonSalesValue = comparisonSales.get(item.menuItem) || 0;

      menuItemData.set(item.menuItem, {
        recommended: existing.recommended + item.recommendedOrderQty,
        comparisonPeriod: existing.comparisonPeriod + comparisonSalesValue,
      });
    });

    // Convert to chart data format
    return Array.from(menuItemData.entries())
      .map(([menuItem, data]) => ({
        menuItem,
        recommended: data.recommended,
        comparisonPeriod: data.comparisonPeriod,
      }))
      .sort((a, b) => b.recommended - a.recommended) // Sort by recommended quantity
      .slice(0, 10); // Show top 10 items
  }, [predictions, sales, isWeeklyPrediction]);

  // Loading state
  if (predictionsLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Menu Item Predictions</CardTitle>
          <CardDescription>Loading prediction data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (predictionsError) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Menu Item Predictions</CardTitle>
          <CardDescription>Failed to load prediction data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {predictionsError instanceof Error
              ? predictionsError.message
              : predictionsError}
          </p>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (chartData.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconChefHat className="h-5 w-5" />
            Menu Item Predictions
          </CardTitle>
          <CardDescription>
            No prediction data available. Create a prediction to see recommended
            quantities vs previous month's sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isShiftHeld && "bg-orange-50 border-orange-200 text-orange-700"
            )}
            title={
              isShiftHeld
                ? "Release Shift for regular prediction"
                : "Hold Shift for immediate prediction"
            }
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isShiftHeld ? (
              <IconBolt className="h-4 w-4" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {isShiftHeld ? "Immediate Prediction" : "Create Prediction"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconChefHat className="h-5 w-5" />
          Menu Item Predictions
        </CardTitle>
        <CardDescription>
          Recommended order quantities vs previous{" "}
          {isWeeklyPrediction ? "week" : "month"}'s actual sales
        </CardDescription>

        <CardAction className="flex items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            value={isWeeklyPrediction ? "weekly" : "monthly"}
            onValueChange={handleToggleChange}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isShiftHeld && "bg-orange-50 border-orange-200 text-orange-700"
            )}
            title={
              isShiftHeld
                ? "Release Shift for regular prediction"
                : "Hold Shift for immediate prediction"
            }
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isShiftHeld ? (
              <IconBolt className="h-4 w-4" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {isShiftHeld ? "Immediate" : "Refresh"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full h-48"
        >
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="menuItem"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              textAnchor="middle"
              height={60}
              style={{
                fontSize: "0.75rem",
              }}
              tickFormatter={(value) =>
                value.length > 6 ? value.slice(0, 6) + "..." : value
              }
            />
            <YAxis />
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
                        {chartConfig[name as keyof typeof chartConfig]?.label ||
                          name}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="recommended"
              fill={chartConfig.recommended.color}
              name="recommended"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="comparisonPeriod"
              fill={chartConfig.comparisonPeriod.color}
              name="comparisonPeriod"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
