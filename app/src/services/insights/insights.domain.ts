/**
 * Insights Domain Types
 *
 * Defines TypeScript interfaces and enums for the insights service.
 * Follows the same pattern as sales.domain.ts and predictions.domain.ts
 */

// ============================================================================
// Enums
// ============================================================================

export enum InsightStatus {
  QUEUED = "queued",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ============================================================================
// API Interfaces (Raw data from backend)
// ============================================================================

/**
 * Individual insight answer from API (raw format)
 */
export interface IInsightAnswer {
  question: string;
  answer: {
    summary: string;
    insights: Array<{
      title: string;
      description: string;
      metrics: Record<string, string>;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      expected_impact: string;
    }>;
    data_limitations: string[];
  };
  question_text: string;
}

/**
 * Fixed insights response from API (raw format)
 */
export interface IFixedInsightsResponse {
  job_id: number;
  status: string;
  result?: {
    label: string;
    uploaded_file_id?: number;
    filters?: {
      limit: number;
      order?: string;
      order_direction: string;
      since?: string;
      until?: string;
    };
    answers: IInsightAnswer[];
  };
  error?: string;
}

/**
 * Request parameters for creating fixed insights
 */
export interface ICreateFixedInsightsRequest {
  user_id: number;
  file_id?: number;
  limit?: number;
  order?: string;
  order_direction?: "asc" | "desc";
  since?: string;
  until?: string;
}

/**
 * Request parameters for getting fixed insights
 */
export interface IGetFixedInsightsRequest {
  user_id: number;
  job_id?: number;
}

// ============================================================================
// Domain Interfaces (Application-facing, with proper types)
// ============================================================================

/**
 * Individual insight answer (domain model)
 */
export interface InsightAnswer {
  question: string;
  answer: {
    summary: string;
    insights: Array<{
      title: string;
      description: string;
      metrics: Record<string, string>;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      expectedImpact: string;
    }>;
    dataLimitations: string[];
  };
  questionText: string;
}

/**
 * Fixed insights response (domain model)
 */
export interface FixedInsightsResponse {
  jobId: number;
  status: InsightStatus;
  result?: {
    label: string;
    uploadedFileId?: number;
    filters?: {
      limit: number;
      order?: string;
      orderDirection: string;
      since?: string;
      until?: string;
    };
    answers: InsightAnswer[];
  };
  error?: string;
}

/**
 * Request parameters for creating fixed insights (domain model)
 */
export interface CreateFixedInsightsRequest {
  userId: number;
  fileId?: number;
  limit?: number;
  order?: string;
  orderDirection?: "asc" | "desc";
  since?: Date;
  until?: Date;
}

/**
 * Request parameters for getting fixed insights (domain model)
 */
export interface GetFixedInsightsRequest {
  userId: number;
  jobId?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid InsightStatus
 */
export function isInsightStatus(value: any): value is InsightStatus {
  return Object.values(InsightStatus).includes(value);
}

/**
 * Format date to ISO string
 */
export function formatInsightsDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function parseInsightsDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
}

// ============================================================================
// UI Helper Objects
// ============================================================================

export const InsightStatusNames = {
  [InsightStatus.QUEUED]: "Queued",
  [InsightStatus.IN_PROGRESS]: "In Progress",
  [InsightStatus.COMPLETED]: "Completed",
  [InsightStatus.FAILED]: "Failed",
} satisfies Record<InsightStatus, string>;

export const InsightStatusColors = {
  [InsightStatus.QUEUED]: "bg-yellow-100 text-yellow-800",
  [InsightStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
  [InsightStatus.COMPLETED]: "bg-green-100 text-green-800",
  [InsightStatus.FAILED]: "bg-red-100 text-red-800",
} satisfies Record<InsightStatus, string>;
