import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles } from "lucide-react";
import { FixedInsightsContainer } from "@/components/insights";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/personal/insights")({
  component: InsightsPage,
});

const suggestedActions = [
  "Check expiring items this week",
  "Generate inventory report",
  "Predict next week's demand",
  "Show top selling items",
  "Create shopping list for weekend",
  "Analyze food waste patterns",
];

function InsightsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            Personalized insights and recommendations for your restaurant
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
          <Button variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Fixed Insights Container */}
      <FixedInsightsContainer userId={parseInt(user?.id || "1")} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you can ask the assistant to help with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestedActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 text-left justify-start"
                onClick={() => {
                  // For now, just show an alert. In the future, this could trigger specific insights
                  alert(`"${action}" - This will be integrated with the header chat assistant!`);
                }}
              >
                <div className="text-sm">{action}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assistant Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Assistant Capabilities</CardTitle>
          <CardDescription>
            What our AI assistant can help you with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Inventory monitoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Demand prediction</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Order management</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Cost optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Report generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Menu planning</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
