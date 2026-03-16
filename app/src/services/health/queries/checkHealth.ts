/**
 * Health Check Query
 *
 * React Query hook for checking system health.
 */

import { useQuery } from "@tanstack/react-query";
import type { HealthResponse, UseHealthCheckOptions } from "../health.domain";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Check system health
 */
async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check health: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as HealthResponse;
}

// ============================================================================
// React Query Hook
// ============================================================================

/**
 * Hook to check system health
 *
 * @param options - Query options
 */
export function useHealthCheck(options?: UseHealthCheckOptions) {
  return useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export default useHealthCheck;
