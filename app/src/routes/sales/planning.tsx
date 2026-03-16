import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ShoppingCart,
  Users,
  CalendarDays,
} from "lucide-react";
import {
  IconChartLine,
  IconCalendarEvent,
  IconTrendingUp,
  IconTargetArrow,
} from "@tabler/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SalesRevenueChart } from "@/components/sales/SalesRevenueChart";

export const Route = createFileRoute("/sales/planning")({
  component: SalesPlanningPage,
});

function SalesPlanningPage() {
  const ordersChartConfig = {
    orders: {
      label: "Orders",
      color: "hsl(var(--chart-2))",
    },
    customers: {
      label: "Customers",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const growthChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    growth: {
      label: "Growth Rate",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  // Enhanced data for comprehensive planning
  const weeklyData = [
    {
      day: "Mon",
      revenue: 2400,
      orders: 32,
      customers: 28,
      avgOrder: 75,
      predicted: 2450,
      confidence: 94,
    },
    {
      day: "Tue",
      revenue: 2100,
      orders: 28,
      customers: 25,
      avgOrder: 75,
      predicted: 2200,
      confidence: 91,
    },
    {
      day: "Wed",
      revenue: 2800,
      orders: 35,
      customers: 32,
      avgOrder: 80,
      predicted: 2900,
      confidence: 89,
    },
    {
      day: "Thu",
      revenue: 3200,
      orders: 42,
      customers: 38,
      avgOrder: 76,
      predicted: 3300,
      confidence: 87,
    },
    {
      day: "Fri",
      revenue: 4500,
      orders: 58,
      customers: 52,
      avgOrder: 78,
      predicted: 4600,
      confidence: 92,
    },
    {
      day: "Sat",
      revenue: 3800,
      orders: 48,
      customers: 44,
      avgOrder: 79,
      predicted: 3900,
      confidence: 85,
    },
    {
      day: "Sun",
      revenue: 2200,
      orders: 30,
      customers: 26,
      avgOrder: 73,
      predicted: 2300,
      confidence: 88,
    },
  ];

  const monthlyTrends = [
    { month: "Jan", revenue: 45000, orders: 600, growth: 8.2 },
    { month: "Feb", revenue: 48500, orders: 645, growth: 7.8 },
    { month: "Mar", revenue: 52000, orders: 690, growth: 7.2 },
    { month: "Apr", revenue: 55800, orders: 735, growth: 7.3 },
    { month: "May", revenue: 59200, orders: 780, growth: 6.1 },
    { month: "Jun", revenue: 62500, orders: 825, growth: 5.6 },
  ];

  const salesChannels = [
    {
      channel: "Dine-in",
      revenue: 38500,
      percentage: 62,
      orders: 485,
      avgOrder: 79.4,
      trend: "up",
    },
    {
      channel: "Takeout",
      revenue: 18200,
      percentage: 29,
      orders: 315,
      avgOrder: 57.8,
      trend: "stable",
    },
    {
      channel: "Delivery",
      revenue: 5800,
      percentage: 9,
      orders: 85,
      avgOrder: 68.2,
      trend: "up",
    },
  ];

  const strategicInsights = [
    {
      type: "opportunity",
      title: "Weekend Revenue Optimization",
      description:
        "Implement weekend brunch specials to boost Saturday/Sunday performance by 15-20%.",
      impact: "High",
      timeline: "2 weeks",
      estimatedGain: "$2,400/month",
    },
    {
      type: "growth",
      title: "Delivery Channel Expansion",
      description:
        "Delivery shows strong growth potential. Consider expanding delivery radius and partnerships.",
      impact: "Medium",
      timeline: "1 month",
      estimatedGain: "$3,200/month",
    },
    {
      type: "efficiency",
      title: "Thursday Peak Management",
      description:
        "Optimize staffing and inventory for Thursday peaks to reduce wait times and increase capacity.",
      impact: "Medium",
      timeline: "Immediate",
      estimatedGain: "$1,800/month",
    },
  ];

  // Calculate summary metrics
  const totalWeeklyRevenue = weeklyData.reduce(
    (sum, day) => sum + day.revenue,
    0,
  );
  const avgDailyRevenue = Math.round(totalWeeklyRevenue / weeklyData.length);
  const totalOrders = weeklyData.reduce((sum, day) => sum + day.orders, 0);
  const avgOrderValue = Math.round(totalWeeklyRevenue / totalOrders);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Planning</h1>
          <p className="text-muted-foreground">
            Advanced sales forecasting, channel analysis, and strategic planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <Button variant="outline">
            <IconCalendarEvent className="h-4 w-4 mr-2" />
            Export Forecast
          </Button>
          <Button>
            <CalendarDays className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Daily Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgDailyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +8% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Order Value
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +3% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Friday</div>
            <p className="text-xs text-muted-foreground">$4,500 avg revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <SalesRevenueChart />
        <Card>
          <CardHeader>
            <CardTitle>Order Volume Trends</CardTitle>
            <CardDescription>
              Daily order count and customer flow patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersChartConfig}>
              <BarChart
                accessibilityLayer
                data={weeklyData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
                <Bar
                  dataKey="customers"
                  fill="var(--color-customers)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Growth Trend */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Revenue Growth Trend</CardTitle>
          <CardDescription>
            Revenue progression and growth rate analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={growthChartConfig}>
            <ComposedChart
              accessibilityLayer
              data={monthlyTrends}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={4}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="growth"
                stroke="var(--color-growth)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Sales Channels Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Channel Performance</CardTitle>
          <CardDescription>
            Revenue breakdown and performance by sales channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {salesChannels.map((channel, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{channel.channel}</h3>
                  <div className="text-sm text-green-600 font-medium">
                    {channel.percentage}%
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium">
                      ${channel.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-medium">{channel.orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Order:</span>
                    <span className="font-medium">
                      ${channel.avgOrder.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trend:</span>
                    <div className="flex items-center">
                      {channel.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : channel.trend === "down" ? (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      ) : (
                        <Target className="h-3 w-3 text-blue-500 mr-1" />
                      )}
                      <span className="text-xs capitalize">
                        {channel.trend}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${channel.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Insights & Recommendations</CardTitle>
          <CardDescription>
            AI-powered insights based on sales data analysis and market trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategicInsights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  insight.type === "opportunity"
                    ? "bg-green-50 border-green-200"
                    : insight.type === "growth"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-purple-50 border-purple-200"
                }`}
              >
                {insight.type === "opportunity" ? (
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                ) : insight.type === "growth" ? (
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{insight.title}</h4>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {insight.estimatedGain}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        estimated gain
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {insight.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full ${
                        insight.impact === "High"
                          ? "bg-red-100 text-red-700"
                          : insight.impact === "Medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {insight.impact} Impact
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {insight.timeline}
                    </span>
                    <Button size="sm" variant="outline" className="ml-auto">
                      Implement
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
