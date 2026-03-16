/**
 * Reports Domain
 *
 * Type definitions and interfaces for the reports service.
 */

// ============================================================================
// Request/Response Types
// ============================================================================

export interface GenerateReportRequest {
  user_id: number;
  email: string;
}

export interface GenerateReportResponse {
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ReportError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}

// ============================================================================
// Hook Options
// ============================================================================

export interface UseGenerateReportOptions {
  onSuccess?: (data: GenerateReportResponse) => void;
  onError?: (error: Error) => void;
}
