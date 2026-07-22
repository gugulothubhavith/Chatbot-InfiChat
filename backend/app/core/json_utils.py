import json
import re
import logging
from typing import Any, Dict, List, Union
import json_repair

logger = logging.getLogger(__name__)

def extract_json_from_text(text: str) -> Union[Dict[str, Any], List[Any]]:
    """
    Robustly extract and parse a JSON object or array from a string.
    Strips markdown, handles trailing commas, and uses json_repair to
    fix broken JSON commonly hallucinated by LLMs.
    """
    if not text:
        raise ValueError("Cannot extract JSON from empty text")

    # 1. Strip markdown wrappers if present
    text = text.strip()
    if text.startswith("```"):
        # Match everything between ```json (or just ```) and the last ```
        match = re.search(r"```(?:json)?\n?(.*?)```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
        else:
            # Fallback if no closing ```
            text = text.split("\n", 1)[-1].strip()

    # 2. Try standard parse (handles standard JSON)
    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError as e:
        logger.debug(f"Standard JSON parse failed, trying json-repair: {e}")

    # 3. Use json_repair as a robust fallback
    try:
        repaired = json_repair.loads(text)
        if repaired is not None and isinstance(repaired, (dict, list)):
            return repaired
    except Exception as e:
        logger.debug(f"json-repair failed on full text: {e}")

    # 4. Heuristic: Regex extract first valid-looking JSON block (Object or Array)
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if match:
        extracted = match.group(1)
        try:
            repaired_extracted = json_repair.loads(extracted)
            if repaired_extracted is not None and isinstance(repaired_extracted, (dict, list)):
                return repaired_extracted
            return json.loads(extracted, strict=False)
        except Exception as e:
            raise ValueError(f"Extracted JSON block was still invalid: {e}")
            
    raise ValueError("No valid JSON object or array found in text")
