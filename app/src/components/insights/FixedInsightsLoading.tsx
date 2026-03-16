/**
 * Fixed Insights Loading Component
 *
 * Shows loading state while insights are being generated.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface FixedInsightsLoadingProps {
  className?: string;
  isFirstTime?: boolean;
}

const loadingMessages = [
  "Getting latest insights for you...",
  "Analyzing your restaurant data...",
  "Processing sales patterns...",
  "Identifying optimization opportunities...",
  "Generating personalized recommendations...",
  "Almost ready with your insights...",
];

export function FixedInsightsLoading({ className, isFirstTime = false }: FixedInsightsLoadingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Rotate through loading messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  // Animate dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  const getTitle = () => {
    if (isFirstTime) {
      return "Generating Your First Insights";
    }
    return "Getting Latest Insights";
  };

  const getDescription = () => {
    if (isFirstTime) {
      return "Our AI is analyzing your restaurant data for the first time to provide personalized insights";
    }
    return loadingMessages[currentMessageIndex] + dots;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          {getTitle()}
          <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
        </CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading skeleton for insights */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full animate-pulse" />
          <Skeleton className="h-4 w-3/4 animate-pulse" />
          <Skeleton className="h-4 w-1/2 animate-pulse" />
        </div>
        
        {/* Accordion skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded animate-pulse" />
          <Skeleton className="h-16 w-full rounded animate-pulse" />
          <Skeleton className="h-10 w-full rounded animate-pulse" />
          <Skeleton className="h-16 w-full rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
