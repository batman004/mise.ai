/**
 * Fixed Insights Container Component
 *
 * Main container that handles the complete insights flow including loading,
 * error states, and displaying the insights.
 */

import { useEffect, useState } from "react";
import { FixedInsightsCard } from "./FixedInsightsCard";
import { FixedInsightsLoading } from "./FixedInsightsLoading";
import { FixedInsightsError } from "./FixedInsightsError";
import { 
  useFixedInsights, 
  useCreateFixedInsights,
  useInsightsStore,
  InsightStatus 
} from "@/services/insights";

interface FixedInsightsContainerProps {
  userId: number;
  className?: string;
}

export function FixedInsightsContainer({ userId, className }: FixedInsightsContainerProps) {
  const { fixedInsights, isLoading, error } = useInsightsStore();
  
  // Query for existing insights
  const { data: existingInsights, isLoading: isQueryLoading, error: queryError } = useFixedInsights(
    { userId },
    { 
      enabled: true,
      refetchInterval: fixedInsights?.status === InsightStatus.IN_PROGRESS ? 2000 : undefined,
    }
  );

  // Mutation for creating new insights
  const createInsightsMutation = useCreateFixedInsights({
    onSuccess: () => {
      console.log("Insights created successfully");
    },
    onError: (error) => {
      console.error("Failed to create insights:", error);
    },
  });

  // Check if the error is a 404 (no insights exist yet)
  const isNoInsightsError = queryError && 
    queryError instanceof Error && 
    queryError.message.includes("No LLM inference jobs have been run completely for this user");

  // Auto-create insights if none exist (404 error means no insights)
  useEffect(() => {
    if (isNoInsightsError && !createInsightsMutation.isPending && !createInsightsMutation.isSuccess) {
      // Add a random delay between 2-3 seconds for subsequent visits to feel more natural
      const randomDelay = Math.random() * 1000 + 2000; // 2000-3000ms
      const timer = setTimeout(() => {
        console.log("No insights found, creating new ones...");
        createInsightsMutation.mutate({ userId });
      }, randomDelay);

      return () => clearTimeout(timer);
    }
  }, [isNoInsightsError, createInsightsMutation, userId]);

  // Determine what to show
  const currentInsights = existingInsights || fixedInsights;
  const currentError = (!isNoInsightsError && queryError) || error || createInsightsMutation.error;
  const isCurrentlyLoading = isQueryLoading || isLoading || createInsightsMutation.isPending || isNoInsightsError;

  const randomDelaySub = Math.random() * 3000 + 5000; // 5000-8000ms

  const [isSubLoading, setIsSubLoading] = useState(true);
  useEffect(() => {
    if (isSubLoading) {
      const timer = setTimeout(() => {
        setIsSubLoading(false);
      }, randomDelaySub);
      return () => clearTimeout(timer);
    }
  }, [isSubLoading, randomDelaySub]);

  // Show loading state
  if (isCurrentlyLoading || isSubLoading) {
    return <FixedInsightsLoading className={className} isFirstTime={!!isNoInsightsError} />;
  }

  // Show error state (only for real errors, not 404s)
  if (currentError) {
    return (
      <FixedInsightsError 
        error={currentError instanceof Error ? currentError.message : currentError as string}
        onRetry={() => createInsightsMutation.mutate({ userId })}
        className={className}
      />
    );
  }

  // Show insights if completed
  if (currentInsights?.status === InsightStatus.COMPLETED && currentInsights.result?.answers) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentInsights.result.answers.map((insight, index) => (
            <FixedInsightsCard key={insight.question || index} insight={insight} />
          ))}
        </div>
      </div>
    );
  }

  // Show loading for other statuses (queued, in_progress)
  if (currentInsights?.status === InsightStatus.QUEUED || currentInsights?.status === InsightStatus.IN_PROGRESS) {
    return <FixedInsightsLoading className={className} />;
  }

  // Fallback - should not reach here
  return (
    <FixedInsightsError 
      error="No insights available"
      onRetry={() => createInsightsMutation.mutate({ userId })}
      className={className}
    />
  );
}
