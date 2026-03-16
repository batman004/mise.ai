/**
 * Ask Question Query
 *
 * React Query hook for asking questions via the LLM service.
 */

import { useMutation } from "@tanstack/react-query";
import type {
  QuestionRequest,
  QuestionResponse,
  UseAskQuestionOptions,
} from "../question.domain";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Ask a question to the LLM service
 */
async function askQuestion(
  request: QuestionRequest
): Promise<QuestionResponse> {
  const response = await fetch(`${API_URL}/llm/question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to ask question: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as QuestionResponse;
}

// ============================================================================
// React Query Hook
// ============================================================================

/**
 * Hook to ask a question to the LLM service
 *
 * @param options - Mutation options
 */
export function useAskQuestion(options?: UseAskQuestionOptions) {
  return useMutation({
    mutationFn: askQuestion,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export default useAskQuestion;
