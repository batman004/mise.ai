import json
import re
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from itertools import cycle

import pandas as pd
from loguru import logger

from openai import OpenAI as OpenAIClient
from openai import APIError as OpenAIAPIError

try:
    from google import genai
    from google.genai.errors import (
        APIError as GeminiAPIError,
    )
    from google.genai import types
    import google.auth

    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    logger.warning("google-genai not available, will use OpenAI only")

from configuration import (
    OPENAI_API_KEY,
    VERTEXAI_PROJECT_ID,
    VERTEXAI_LOCATIONS,
)


class LLMService:
    _GEMINI_MODEL_NAME = "gemini-2.5-flash"
    _GEMINI_SYSTEM_INSTRUCTION = "You are a meticulous data scientist. Output must be valid JSON only, no code fences, no extra commentary, matching the user-provided schema exactly."

    _OPENAI_MODEL_NAME = "gpt-5-nano"

    _INFERENCE_QUESTIONS = [
        "When are my busiest periods, which items sell best during different times, and how can I optimize my preparation schedule?",
        "How do weather conditions, special events, and other external factors affect my sales, and how should I adjust my operations accordingly?",
        "What are my most and least profitable menu items, and should I adjust my menu based on ingredient costs versus revenue?",
        "Which menu items are generating the most food waste and what is the financial impact on my business?",
        "Based on my sales patterns and external factors, how much of each ingredient should I order for the next week?",
    ]

    def __init__(self):
        self.gemini_clients: Dict[str, Any] = {}
        # Check if we have Google Cloud credentials

        # Try to get credentials first to check if they're available
        has_gcp_credentials = False
        if HAS_GEMINI:
            try:
                credentials, project = google.auth.default()
                has_gcp_credentials = credentials is not None
                logger.info("Google Cloud credentials found")
            except Exception:
                logger.warning(
                    "Google Cloud credentials not available - will skip Gemini Vertex AI"
                )
                has_gcp_credentials = False

        if has_gcp_credentials and VERTEXAI_PROJECT_ID and VERTEXAI_LOCATIONS:
            for location in VERTEXAI_LOCATIONS:
                try:
                    # Initialize a Gemini client for a specific Vertex AI region
                    client = genai.Client(
                        vertexai=True, project=VERTEXAI_PROJECT_ID, location=location
                    )
                    self.gemini_clients[location] = client
                    logger.info(
                        f"Initialized Gemini Vertex AI client for location: {location}"
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to initialize Gemini Vertex AI client for {location}: {e}"
                    )

        if not self.gemini_clients:
            logger.warning(
                "No Gemini Vertex AI clients successfully initialized. Will use OpenAI as primary."
            )

        # Initialize the location cycle iterator
        self._gemini_location_cycle = cycle(
            list(self.gemini_clients.keys()) if self.gemini_clients else []
        )

        self.openai_client: Optional[OpenAIClient] = None
        if OPENAI_API_KEY:
            try:
                self.openai_client = OpenAIClient(api_key=OPENAI_API_KEY)
                logger.info("Initialized OpenAI client.")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        else:
            raise ValueError("OPENAI_API_KEY not configured")

        if not self.openai_client:
            raise ValueError(
                "No valid LLM clients could be initialized. Check API keys and configurations."
            )

    def _call_gemini_api(self, prompt: str) -> Optional[str]:
        """
        Call the Gemini API as fallback, attempting regional failover.
        """
        if not self.gemini_clients:
            logger.debug("No Gemini clients available")
            return None

        for _ in range(len(self.gemini_clients)):
            try:
                location = next(self._gemini_location_cycle)
                client = self.gemini_clients[location]

                logger.debug(f"Attempting Gemini call in region: {location}")

                config = types.GenerateContentConfig(
                    system_instruction=self._GEMINI_SYSTEM_INSTRUCTION,
                )

                resp = client.models.generate_content(
                    model=self._GEMINI_MODEL_NAME,
                    contents=prompt,
                    config=config,
                )

                content = resp.text
                logger.info(
                    f"Received successful Gemini response from region: {location}"
                )
                return content

            except GeminiAPIError as e:
                logger.warning(
                    f"Gemini API error in region {location}: {e}. Trying next region..."
                )
            except Exception as e:
                logger.exception(
                    f"Unexpected error during Gemini call in region {location}: {e}. Trying next region..."
                )

        logger.error("All Gemini regional attempts failed.")
        return None

    def _call_openai_api(self, prompt: str) -> Optional[str]:
        """
        Call the OpenAI API (primary).
        """
        if not self.openai_client:
            logger.error("OpenAI client not initialized.")
            return None

        try:
            resp = self.openai_client.chat.completions.create(
                model=self._OPENAI_MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": self._GEMINI_SYSTEM_INSTRUCTION,
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = resp.choices[0].message.content if resp.choices else None
            logger.info("Received successful OpenAI response.")
            return content
        except OpenAIAPIError as e:
            logger.error(f"OpenAI API error: {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error during OpenAI call: {e}")
            return None

    def generate_fixed_insights(
        self,
        label: str,
        rows_data: List[dict],
    ) -> dict:
        """
        Generate fixed insights from raw data, using OpenAI first and falling back to Gemini.
        """
        if not rows_data:
            raise ValueError("No data provided")

        df = pd.DataFrame(rows_data)
        # Use a more constrained string representation for the prompt if needed
        df_str = df.head(
            100
        ).to_string()  # Limiting to 100 rows for prompt size optimization

        questions = LLMService._INFERENCE_QUESTIONS

        def ask_one(question_text: str) -> dict:
            prompt = f"""
            Context: You analyze restaurant operations data.
            Label: {label}
            DataFrame sample (first 100 rows): {df_str}

            Question: {question_text}

            Return STRICT JSON ONLY with keys exactly:
            {{
            "summary": "string",
            "insights": [{{"title": "string", "description": "string", "metrics": {{"string": "string"}}}}],
            "recommendations": [{{"title": "string", "description": "string", "expected_impact": "string"}}],
            "data_limitations": ["string"]
            }}
            """

            content = self._call_openai_api(prompt)

            if not content:
                content = self._call_gemini_api(prompt)

            if not content:
                return {"error": "No content from any LLM service"}

            return self.parse_llm_output(content)

        # collect answers keyed by q index then transform to list
        answers_map: dict = {}
        with ThreadPoolExecutor(max_workers=min(5, len(questions))) as executor:
            future_to_idx = {
                executor.submit(ask_one, q): idx
                for idx, q in enumerate(questions, start=1)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    answers_map[f"q{idx}"] = future.result()
                except Exception as ex:
                    logger.exception(f"LLM question q{idx} failed: {ex}")
                    answers_map[f"q{idx}"] = {"error": str(ex)}

        # Transform dict-of-answers to list-of-dicts: [{"question":"q1","answer":{...}}, ...]
        answers_list = [
            {
                "question": f"q{idx}",
                "answer": answers_map.get(f"q{idx}"),
                "question_text": questions[idx - 1],
            }
            for idx in range(1, len(questions) + 1)
        ]

        payload = {
            "label": label,
            "answers": answers_list,
        }

        logger.info(f"Generated LLM insights for label={label}")
        return payload

    def answer_question(self, question: str, rows_data: List[dict]) -> dict:
        """
        Answer a user question based on provided context data.

        Args:
            question: The user's question (e.g., "Show me a wastage summary")
            rows_data: List of row data from the database (first 100 rows)

        Returns:
            Dictionary with the answer
        """
        if not rows_data:
            return {"error": "No data provided"}

        # Convert to DataFrame and limit to first 100 rows
        df = pd.DataFrame(rows_data)
        df_str = df.head(100).to_string()

        prompt = f"""
        Context: You are a helpful AI assistant analyzing restaurant operations data.

        Data (first 100 rows): {df_str}

        User Question: {question}

        Please provide a brief paragraph answering the question based on the provided data.
        Focus on clear insights and actionable information.

        Return STRICT JSON ONLY:
        {{
            "answer": "brief paragraph answering the question",
            "key_points": ["point1", "point2"],
            "data_points_referenced": {{"metric": "value"}}
        }}
        """

        logger.info(f"Sending question to LLM: {question}")

        # Try OpenAI first, then Gemini
        content = self._call_openai_api(prompt)
        if not content:
            content = self._call_gemini_api(prompt)

        if not content:
            return {"error": "No content from any LLM service"}

        return self.parse_llm_output(content)

    def parse_llm_output(self, llm_response: str) -> dict:
        """
        Parse the JSON response from the LLM and return it as a Python dictionary.
        """
        try:
            # Extract JSON content from the LLM response (handling potential code fences)
            json_match = re.search(r"```(?:json)?\s*(.+?)```", llm_response, re.DOTALL)

            if json_match:
                # Found JSON in code block
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON-like content directly
                json_str = llm_response.strip()

                # Remove any non-JSON text at the beginning or end
                start_idx = json_str.find("{")
                end_idx = json_str.rfind("}")

                if start_idx >= 0 and end_idx >= 0:
                    json_str = json_str[start_idx : end_idx + 1]

            # Parse the JSON string into a Python dictionary
            parsed_data = json.loads(json_str)
            return parsed_data

        except json.JSONDecodeError as e:
            # Handle JSON parsing errors
            logger.exception(
                f"Error parsing JSON: {e} | Raw Response: {llm_response[:200]}..."
            )
            return {"error": "Failed to parse LLM response as JSON"}
        except Exception as e:
            # Handle any other unexpected errors
            logger.exception(f"Unexpected error: {e}")
            return {"error": f"Unexpected error: {str(e)}"}
