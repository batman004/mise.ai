/**
 * Health Domain Models
 *
 * Type definitions for the health service.
 */

// ============================================================================
// Response Models
// ============================================================================

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services?: {
    database: "healthy" | "unhealthy";
    rabbitmq: "healthy" | "unhealthy";
  };
  error?: string;
}

// ============================================================================
// Query Options
// ============================================================================

export interface UseHealthCheckOptions {
  onSuccess?: (data: HealthResponse) => void;
  onError?: (error: Error) => void;
}
