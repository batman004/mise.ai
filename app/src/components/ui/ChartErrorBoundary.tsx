import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartErrorBoundaryProps {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
  error?: Error | string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  fallback?: ReactNode;
}

export function ChartErrorBoundary({
  title,
  description,
  className,
  children,
  error,
  onRetry,
  isRetrying = false,
  fallback,
}: ChartErrorBoundaryProps) {
  // If there's an error, show error state
  if (error) {
    const errorMessage = typeof error === "string" ? error : error?.message || "An error occurred";
    
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4 text-destructive" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-destructive">{errorMessage}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="h-8"
              >
                {isRetrying ? (
                  <>
                    <IconRefresh className="h-3 w-3 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <IconRefresh className="h-3 w-3 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If fallback is provided and no children, show fallback
  if (fallback && !children) {
    return <>{fallback}</>;
  }

  // Otherwise render children normally
  return <>{children}</>;
}
