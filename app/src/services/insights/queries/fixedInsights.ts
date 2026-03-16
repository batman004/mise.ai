/**
 * Fixed Insights Queries
 *
 * React Query hooks for fetching and creating fixed insights.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFixedInsightsRequest,
  GetFixedInsightsRequest,
  IFixedInsightsResponse,
  FixedInsightsResponse,
} from "../insights.domain";
import { mapIFixedInsightsResponseToFixedInsightsResponse } from "../insights.mapper";
import { useInsightsStore } from "../insights.store";

// ============================================================================
// API Functions
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Create fixed insights job via the API
 */
async function createFixedInsights(
  request: CreateFixedInsightsRequest
): Promise<IFixedInsightsResponse> {
  const params = new URLSearchParams();

  if (request.fileId) {
    params.append("file_id", request.fileId.toString());
  }

  if (request.limit) {
    params.append("limit", request.limit.toString());
  }

  if (request.order) {
    params.append("order", request.order);
  }

  if (request.orderDirection) {
    params.append("order_direction", request.orderDirection);
  }

  if (request.since) {
    params.append("since", request.since.toISOString());
  }

  if (request.until) {
    params.append("until", request.until.toISOString());
  }

  const url = `${API_URL}/llm/fixed-insights/${request.userId}?${params.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create fixed insights: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data as IFixedInsightsResponse;
}

/**
 * Get fixed insights job status/result via the API
 */
async function getFixedInsights(
  request: GetFixedInsightsRequest
): Promise<IFixedInsightsResponse> {
  const params = new URLSearchParams();

  if (request.jobId) {
    params.append("job_id", request.jobId.toString());
  }

  const url = `${API_URL}/llm/fixed-insights/${request.userId}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get fixed insights: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data as IFixedInsightsResponse;
}

// ============================================================================
// React Query Hooks
// ============================================================================

export interface UseFixedInsightsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to get fixed insights for a user
 */
export function useFixedInsights(
  request: GetFixedInsightsRequest,
  options?: UseFixedInsightsOptions
) {
  const { setFixedInsights } = useInsightsStore();

  const query = useQuery({
    queryKey: ["insights", "fixed", request],
    queryFn: async () => {
      const data = await getFixedInsights(request);

      // Map API data to domain models
      const insightsResponse: FixedInsightsResponse =
        mapIFixedInsightsResponseToFixedInsightsResponse(data);

      // Update store
      setFixedInsights(insightsResponse);

      return insightsResponse;
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    fixedInsights: useInsightsStore((state) => state.fixedInsights),
  };
}

export interface UseCreateFixedInsightsOptions {
  onSuccess?: (data: FixedInsightsResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create fixed insights job
 */
export function useCreateFixedInsights(
  options?: UseCreateFixedInsightsOptions
) {
  const queryClient = useQueryClient();
  const { setError, setLoading } = useInsightsStore();

  return useMutation({
    mutationFn: createFixedInsights,
    onSuccess: (data) => {
      // Map API data to domain models
      const insightsResponse: FixedInsightsResponse =
        mapIFixedInsightsResponseToFixedInsightsResponse(data);

      // Update store
      useInsightsStore.getState().setFixedInsights(insightsResponse);

      // Invalidate insights query to keep in sync
      queryClient.invalidateQueries({
        queryKey: ["insights", "fixed"],
      });

      // Call custom success handler
      options?.onSuccess?.(insightsResponse);
    },
    onError: (error) => {
      setError(error as Error);
      options?.onError?.(error as Error);
    },
    onMutate: () => {
      setLoading(true);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export default useFixedInsights;
