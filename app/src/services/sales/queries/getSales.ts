/**
 * Get Sales Query
 *
 * React Query hook for fetching sales data from the backend.
 */

import { useQuery } from "@tanstack/react-query";
import type {
  GetSalesRequest,
  ISalesResponse,
  SalesResponse,
} from "../sales.domain";
import { mapISalesResponseToSalesResponse } from "../sales.mapper";
import { useSalesStore } from "../sales.store";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch sales data from the API
 */
async function fetchSales(request: GetSalesRequest): Promise<ISalesResponse> {
  const {
    userId,
    page = 1,
    limit = 50,
    order,
    orderDirection = "asc",
    since,
    until,
    withMetrics = false,
  } = request;

  const params = new URLSearchParams({
    user_id: userId.toString(),
    page: page.toString(),
    limit: limit.toString(),
    order_direction: orderDirection,
    with_metrics: withMetrics.toString(),
  });

  if (order) {
    params.append("order", order);
  }

  if (since) {
    params.append("since", since.toISOString());
  }

  if (until) {
    params.append("until", until.toISOString());
  }

  const url = `${API_URL}/data/sales?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch sales data: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data as ISalesResponse;
}

// ============================================================================
// React Query Hook
// ============================================================================

export interface UseSalesOptions {
  enabled?: boolean; // Control when the query runs
  refetchInterval?: number; // Auto-refetch interval (for polling)
}

/**
 * Hook to fetch sales data for a user
 *
 * @param request - Request parameters
 * @param options - Query options
 */
export function useSalesQuery(
  request: GetSalesRequest,
  options?: UseSalesOptions
) {
  const { setSales, setMetrics } = useSalesStore();

  const query = useQuery({
    queryKey: ["sales", "data", request],
    queryFn: async () => {
      const data = await fetchSales(request);

      // Map API data to domain models
      const salesResponse: SalesResponse = mapISalesResponseToSalesResponse(data);

      // Update store
      setSales(salesResponse.data);
      if (salesResponse.metrics) {
        setMetrics(salesResponse.metrics);
      }

      return salesResponse;
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    ...query,
    sales: useSalesStore((state) => state.sales),
    metrics: useSalesStore((state) => state.metrics),
  };
}

export default useSalesQuery;