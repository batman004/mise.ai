/**
 * Generate Report Mutation
 *
 * React Query mutation hook for generating comprehensive PDF reports.
 */

import { useMutation } from "@tanstack/react-query";
import type {
  GenerateReportRequest,
  GenerateReportResponse,
  UseGenerateReportOptions,
} from "./reports.domain";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Generate a comprehensive PDF report
 */
async function generateReport(
  request: GenerateReportRequest
): Promise<GenerateReportResponse> {
  const formData = new FormData();
  formData.append("user_id", request.user_id.toString());
  formData.append("email", request.email);

  const response = await fetch(`${API_URL}/report/generate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate report: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GenerateReportResponse;
}

// ============================================================================
// React Query Hook
// ============================================================================

/**
 * Hook to generate a comprehensive PDF report
 *
 * @param options - Mutation options
 */
export function useGenerateReport(options?: UseGenerateReportOptions) {
  return useMutation({
    mutationFn: generateReport,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
