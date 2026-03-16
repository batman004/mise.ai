/**
 * Question Domain Models
 *
 * Type definitions for the question service.
 */

// ============================================================================
// Request Models
// ============================================================================

export interface QuestionRequest {
  question: string;
  user_id: number;
}

// ============================================================================
// Response Models
// ============================================================================

export interface QuestionResponse {
  answer: string;
  key_points: string[];
  data_points_referenced: Record<string, any>;
  cached: boolean;
}

// ============================================================================
// Query Options
// ============================================================================

export interface UseAskQuestionOptions {
  onSuccess?: (data: QuestionResponse) => void;
  onError?: (error: Error) => void;
}
