/**
 * Get Prediction Results Query
 *
 * React Query hook for fetching prediction results from the backend.
 */

import { useQuery } from "@tanstack/react-query";
import type {
  GetPredictionResultsRequest,
  IPredictionResult,
  PredictionResult,
} from "../predictions.domain";
import { mapIPredictionResultToPredictionResult } from "../predictions.mapper";
import { usePredictionsStore } from "../predictions.store";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch prediction results from the API
 */
async function fetchPredictionResults(
  request: GetPredictionResultsRequest
): Promise<IPredictionResult[]> {
  const { user_id, page = 1, limit = 50 } = request;

  const params = new URLSearchParams({
    user_id,
    page: page.toString(),
    limit: limit.toString(),
  });

  const url = `${API_URL}/prediction/results?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch prediction results: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  // Backend returns array directly
  return data as IPredictionResult[];
}

// ============================================================================
// React Query Hook
// ============================================================================

export interface UsePredictionResultsOptions {
  enabled?: boolean; // Control when the query runs
  refetchInterval?: number; // Auto-refetch interval (for polling)
}

/**
 * Hook to fetch prediction results for a user
 *
 * @param request - Request parameters
 * @param options - Query options
 */
export function usePredictionResults(
  request: GetPredictionResultsRequest,
  options?: UsePredictionResultsOptions
) {
  const { setPredictions } = usePredictionsStore();

  const query = useQuery({
    queryKey: ["predictions", "results", request],
    queryFn: async () => {
      const data = await fetchPredictionResults(request);

      // Map API data to domain models
      const predictions: PredictionResult[] = data.map(
        mapIPredictionResultToPredictionResult
      );

      // Update store
      setPredictions(predictions);

      return predictions;
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    ...query,
    predictions: usePredictionsStore((state) => state.predictions),
  };
}

export default usePredictionResults;
