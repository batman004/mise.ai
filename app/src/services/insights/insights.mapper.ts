/**
 * Insights Mapper
 *
 * Transforms data between API format and domain models.
 * Provides validation and type safety.
 */

import type {
  IInsightAnswer,
  IFixedInsightsResponse,
  InsightAnswer,
  FixedInsightsResponse,
  InsightStatus,
} from "./insights.domain";
import { isInsightStatus } from "./insights.domain";

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Map API insight answer to domain insight answer
 */
export function mapIInsightAnswerToInsightAnswer(
  item: IInsightAnswer
): InsightAnswer {
  // Validate required fields
  if (!item.question || typeof item.question !== "string") {
    throw new Error("Invalid question in insight answer");
  }

  if (!item.question_text || typeof item.question_text !== "string") {
    throw new Error("Invalid question_text in insight answer");
  }

  if (!item.answer || typeof item.answer !== "object") {
    throw new Error("Invalid answer object in insight answer");
  }

  const { answer } = item;

  // Validate answer structure
  if (!answer.summary || typeof answer.summary !== "string") {
    throw new Error("Invalid summary in insight answer");
  }

  if (!Array.isArray(answer.insights)) {
    throw new Error("Invalid insights array in insight answer");
  }

  if (!Array.isArray(answer.recommendations)) {
    throw new Error("Invalid recommendations array in insight answer");
  }

  if (!Array.isArray(answer.data_limitations)) {
    throw new Error("Invalid data_limitations array in insight answer");
  }

  // Map insights
  const mappedInsights = answer.insights.map((insight) => {
    if (!insight.title || typeof insight.title !== "string") {
      throw new Error("Invalid insight title");
    }
    if (!insight.description || typeof insight.description !== "string") {
      throw new Error("Invalid insight description");
    }
    if (!insight.metrics || typeof insight.metrics !== "object") {
      throw new Error("Invalid insight metrics");
    }
    return {
      title: insight.title,
      description: insight.description,
      metrics: insight.metrics,
    };
  });

  // Map recommendations
  const mappedRecommendations = answer.recommendations.map((rec) => {
    if (!rec.title || typeof rec.title !== "string") {
      throw new Error("Invalid recommendation title");
    }
    if (!rec.description || typeof rec.description !== "string") {
      throw new Error("Invalid recommendation description");
    }
    if (!rec.expected_impact || typeof rec.expected_impact !== "string") {
      throw new Error("Invalid recommendation expected_impact");
    }
    return {
      title: rec.title,
      description: rec.description,
      expectedImpact: rec.expected_impact,
    };
  });

  // Map data limitations
  const mappedDataLimitations = answer.data_limitations.map((limitation) => {
    if (typeof limitation !== "string") {
      throw new Error("Invalid data limitation");
    }
    return limitation;
  });

  const mapped: InsightAnswer = {
    question: item.question,
    answer: {
      summary: answer.summary,
      insights: mappedInsights,
      recommendations: mappedRecommendations,
      dataLimitations: mappedDataLimitations,
    },
    questionText: item.question_text,
  };

  return mapped;
}

/**
 * Map domain insight answer to API insight answer
 */
export function mapInsightAnswerToIInsightAnswer(
  item: InsightAnswer
): IInsightAnswer {
  const mapped: IInsightAnswer = {
    question: item.question,
    answer: {
      summary: item.answer.summary,
      insights: item.answer.insights.map((insight) => ({
        title: insight.title,
        description: insight.description,
        metrics: insight.metrics,
      })),
      recommendations: item.answer.recommendations.map((rec) => ({
        title: rec.title,
        description: rec.description,
        expected_impact: rec.expectedImpact,
      })),
      data_limitations: item.answer.dataLimitations,
    },
    question_text: item.questionText,
  };

  return mapped;
}

/**
 * Map API fixed insights response to domain fixed insights response
 */
export function mapIFixedInsightsResponseToFixedInsightsResponse(
  response: IFixedInsightsResponse
): FixedInsightsResponse {
  // Validate required fields
  if (typeof response.job_id !== "number" || isNaN(response.job_id)) {
    throw new Error("Invalid job_id in fixed insights response");
  }

  if (!isInsightStatus(response.status)) {
    throw new Error(`Invalid status: ${response.status}`);
  }

  const mapped: FixedInsightsResponse = {
    jobId: response.job_id,
    status: response.status as InsightStatus,
  };

  // Map result if present
  if (response.result) {
    const { result } = response;

    if (!result.label || typeof result.label !== "string") {
      throw new Error("Invalid label in fixed insights result");
    }

    if (
      result.uploaded_file_id &&
      (typeof result.uploaded_file_id !== "number" ||
        isNaN(result.uploaded_file_id))
    ) {
      throw new Error("Invalid uploaded_file_id in fixed insights result");
    }

    if (result.filters && typeof result.filters !== "object") {
      throw new Error("Invalid filters in fixed insights result");
    }

    if (
      result.filters &&
      (typeof result.filters.limit !== "number" || isNaN(result.filters.limit))
    ) {
      throw new Error("Invalid filters.limit in fixed insights result");
    }

    if (
      result.filters &&
      (!result.filters.order_direction ||
        typeof result.filters.order_direction !== "string")
    ) {
      throw new Error(
        "Invalid filters.order_direction in fixed insights result"
      );
    }

    if (!Array.isArray(result.answers)) {
      throw new Error("Invalid answers array in fixed insights result");
    }

    mapped.result = {
      label: result.label,
      uploadedFileId: result.uploaded_file_id,
      filters: result.filters && {
        limit: result.filters.limit,
        order: result.filters.order,
        orderDirection: result.filters.order_direction,
        since: result.filters.since,
        until: result.filters.until,
      },
      answers: result.answers.map(mapIInsightAnswerToInsightAnswer),
    };
  }

  // Map error if present
  if (response.error) {
    mapped.error = response.error;
  }

  return mapped;
}

/**
 * Map domain fixed insights response to API fixed insights response
 */
export function mapFixedInsightsResponseToIFixedInsightsResponse(
  response: FixedInsightsResponse
): IFixedInsightsResponse {
  const mapped: IFixedInsightsResponse = {
    job_id: response.jobId,
    status: response.status,
  };

  if (response.result) {
    mapped.result = {
      label: response.result.label,
      uploaded_file_id: response.result.uploadedFileId,
      filters: response.result.filters && {
        limit: response.result.filters.limit,
        order: response.result.filters.order,
        order_direction: response.result.filters.orderDirection,
        since: response.result.filters.since,
        until: response.result.filters.until,
      },
      answers: response.result.answers.map(mapInsightAnswerToIInsightAnswer),
    };
  }

  if (response.error) {
    mapped.error = response.error;
  }

  return mapped;
}

// ============================================================================
// Exported Mapper Object (Alternative API)
// ============================================================================

export const InsightsMapper = {
  toInsightAnswer: mapIInsightAnswerToInsightAnswer,
  fromInsightAnswer: mapInsightAnswerToIInsightAnswer,
  toResponse: mapIFixedInsightsResponseToFixedInsightsResponse,
  fromResponse: mapFixedInsightsResponseToIFixedInsightsResponse,
} as const;

export default InsightsMapper;
