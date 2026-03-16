import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  variant?: "default" | "destructive";
  showRetryButton?: boolean;
}

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
  isRetrying = false,
  className,
  variant = "destructive",
  showRetryButton = true,
}: ErrorDisplayProps) {
  return (
    <Alert variant={variant} className={cn("", className)}>
      <IconAlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p>{message}</p>
          {showRetryButton && onRetry && (
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
      </AlertDescription>
    </Alert>
  );
}
