/**
 * Fixed Insights Error Component
 *
 * Shows error state when insights generation fails.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface FixedInsightsErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function FixedInsightsError({ error, onRetry, className }: FixedInsightsErrorProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Failed to Generate Insights
        </CardTitle>
        <CardDescription>
          There was an error while generating your insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        
        {onRetry && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
