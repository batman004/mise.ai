import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewLayoutLoader() {
  return (
    <div className="space-y-6">
      {/* Chart grid - matches actual layout structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Sales Chart - lg:col-span-2 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Sales</CardTitle>
            <CardDescription>Revenue trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Menu Prediction Chart - lg:col-span-2 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Menu Predictions</CardTitle>
            <CardDescription>AI-powered menu recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Weather Wastage Chart - lg:col-span-1 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Weather Impact</CardTitle>
            <CardDescription>Wastage by weather conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>

        {/* Wastage Trends Chart - lg:col-span-2 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wastage Trends</CardTitle>
            <CardDescription>Wastage patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>

        {/* Special Events Chart - lg:col-span-1 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Special Events</CardTitle>
            <CardDescription>Wastage during special events</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
