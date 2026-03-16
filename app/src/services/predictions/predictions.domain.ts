/**
 * Predictions Domain Types
 *
 * Defines TypeScript interfaces and enums for the predictions service.
 * Follows the same pattern as sales.domain.ts
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Prediction priority levels
 */
export enum PredictionPriority {
  HIGH = "high",
  LOW = "low",
}

/**
 * Prediction job status
 */
export enum PredictionStatus {
  QUEUED = "queued",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ============================================================================
// API Interfaces (Raw data from backend)
// ============================================================================

/**
 * Individual prediction item from ML model
 */
export interface IPredictionItem {
  date: string;
  menu_item: string;
  time_of_day: string;
  special_event: string;
  weather_condition: string;
  recommended_order_qty: number;
  predicted_quantity_sold: number;
}

/**
 * Request to create a prediction
 */
export interface ICreatePredictionRequest {
  date: string; // YYYY-MM-DD format
  priority?: PredictionPriority;
  user_id?: string;
}

/**
 * Immediate response from creating a prediction
 */
export interface IPredictionResponse {
  job_id: string;
  status: PredictionStatus;
  message: string;
  prediction_data?: IPredictionItem[] | null;
}

/**
 * Stored prediction result from database (raw API format)
 */
export interface IPredictionResult {
  id?: number;
  job_id: string;
  user_id: string;
  prediction_data: IPredictionItem[] | Record<string, any>;
  status: PredictionStatus;
  error_message?: string | null;
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
}

/**
 * Response from GET /prediction/results
 */
export interface IGetPredictionResultsResponse {
  results: IPredictionResult[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Domain Interfaces (Application-facing, with proper types)
// ============================================================================

/**
 * Individual prediction item (domain model)
 */
export interface PredictionItem {
  date: Date;
  menuItem: string;
  timeOfDay: string;
  specialEvent: string;
  weatherCondition: string;
  recommendedOrderQty: number;
  predictedQuantitySold: number;
}

/**
 * Stored prediction result (domain model)
 */
export interface PredictionResult {
  id?: number;
  jobId: string;
  userId: string;
  predictionData: PredictionItem[];
  status: PredictionStatus;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  predictionDate?: Date; // The date this prediction was made for
}

/**
 * Request parameters for getting prediction results
 */
export interface GetPredictionResultsRequest {
  user_id: string;
  page?: number;
  limit?: number;
}

/**
 * Request to create a new prediction
 */
export interface CreatePredictionRequest {
  date: Date; // Will be converted to YYYY-MM-DD
  priority?: PredictionPriority;
  userId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid PredictionPriority
 */
export function isPredictionPriority(value: any): value is PredictionPriority {
  return Object.values(PredictionPriority).includes(value);
}

/**
 * Check if a value is a valid PredictionStatus
 */
export function isPredictionStatus(value: any): value is PredictionStatus {
  return Object.values(PredictionStatus).includes(value);
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatPredictionDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parsePredictionDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
}
