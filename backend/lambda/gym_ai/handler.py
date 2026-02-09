import json
import boto3
from typing import Any, Dict

from shared.utils import api_response

HAIKU_MODEL_ID = "us.anthropic.claude-3-5-haiku-20241022-v1:0"

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

ACTIONS = {
    "misconception",
    "pushback",
    "score",
    "mastery_scenario",
    "mastery_score",
    "broken_config",
}


def _invoke_haiku(system: str, user: str, max_tokens: int = 400) -> str:
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    response = bedrock.invoke_model(
        modelId=HAIKU_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(payload),
    )
    body = json.loads(response["body"].read())
    if body.get("content") and isinstance(body["content"], list):
        return "".join(
            b.get("text", "") for b in body["content"] if b.get("type") == "text"
        )
    return ""


def _extract_json(raw: str) -> Dict[str, Any]:
    import re

    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


def _compress_concept(c: Dict[str, Any]) -> str:
    parts = [f"Name: {c.get('name', '')}"]
    if c.get("tier"):
        parts.append(f"Tier: {c['tier']}")
    kp = c.get("keyPoints", [])
    if kp:
        parts.append(f"Key: {'; '.join(kp[:3])}")
    cp = c.get("commonPitfalls", [])
    if cp:
        parts.append(f"Pitfalls: {'; '.join(cp[:2])}")
    hu = c.get("howToUse", [])
    if hu:
        parts.append(f"Steps: {'; '.join(hu[:3])}")
    return "\n".join(parts)


def _handle_misconception(data: Dict[str, Any]) -> Dict[str, Any]:
    concept = data["concept"]
    system = "You generate plausible misconceptions about learning concepts. Output JSON only."
    user = f"""Concept:\n{_compress_concept(concept)}\n\nGenerate a plausible misconception a student might have. Return JSON:
{{"statement":"The misconception statement","correctionHints":["hint1","hint2"]}}"""
    raw = _invoke_haiku(system, user, 250)
    result = _extract_json(raw)
    if not result.get("statement") or not isinstance(result.get("correctionHints"), list):
        return {"error": "Invalid AI response"}
    return result


def _handle_pushback(data: Dict[str, Any]) -> Dict[str, Any]:
    concept = data["concept"]
    diagnosis = data.get("diagnosis", "")
    system = "You are a skeptical peer reviewer. Output JSON only."
    user = f"""Concept:\n{_compress_concept(concept)}\n\nStudent's diagnosis: "{diagnosis}"\n\nGenerate a follow-up challenge question. Return JSON:
{{"challenge":"Your follow-up question challenging their explanation"}}"""
    raw = _invoke_haiku(system, user, 150)
    result = _extract_json(raw)
    if not result.get("challenge"):
        return {"error": "Invalid AI response"}
    return result


def _handle_score(data: Dict[str, Any]) -> Dict[str, Any]:
    concept = data["concept"]
    response_text = data.get("response", "")
    stage = data.get("stage", "correction")
    system = "You score student responses for conceptual accuracy. Output JSON only."
    user = f"""Concept:\n{_compress_concept(concept)}\n\nStage: {stage}\nStudent response: "{response_text}"\n\nScore 0-1 for accuracy. Return JSON:
{{"score":0.0,"feedback":"Brief feedback","strengths":["s1"],"gaps":["g1"]}}"""
    raw = _invoke_haiku(system, user, 200)
    result = _extract_json(raw)
    if not isinstance(result.get("score"), (int, float)):
        return {"error": "Invalid AI response"}
    result["score"] = max(0, min(1, result["score"]))
    return result


def _handle_mastery_scenario(data: Dict[str, Any]) -> Dict[str, Any]:
    concepts = data.get("concepts", [])
    compressed = "\n---\n".join(_compress_concept(c) for c in concepts[:5])
    system = "You create realistic professional scenarios requiring synthesis of multiple concepts. Output JSON only."
    user = f"""Concepts:\n{compressed}\n\nCreate a scenario requiring all concepts. Return JSON:
{{"scenario":"The scenario description","requirements":["req1","req2","req3"],"conceptFocus":["concept1","concept2"]}}"""
    raw = _invoke_haiku(system, user, 350)
    result = _extract_json(raw)
    if not result.get("scenario"):
        return {"error": "Invalid AI response"}
    return result


def _handle_mastery_score(data: Dict[str, Any]) -> Dict[str, Any]:
    concepts = data.get("concepts", [])
    response_text = data.get("response", "")
    names = ", ".join(c.get("name", "") for c in concepts[:5])
    system = "You evaluate mastery-level responses for depth and synthesis. Output JSON only."
    user = f"""Concepts: {names}\n\nStudent response: "{response_text[:1500]}"\n\nScore 0-1 for mastery. Return JSON:
{{"score":0.0,"feedback":"Brief feedback","strengths":["s1"],"gaps":["g1"]}}"""
    raw = _invoke_haiku(system, user, 250)
    result = _extract_json(raw)
    if not isinstance(result.get("score"), (int, float)):
        return {"error": "Invalid AI response"}
    result["score"] = max(0, min(1, result["score"]))
    return result


def _handle_broken_config(data: Dict[str, Any]) -> Dict[str, Any]:
    concept = data["concept"]
    system = "You create broken system configurations for pre-mortem exercises. Output JSON only."
    user = f"""Concept:\n{_compress_concept(concept)}\n\nCreate a 5-7 step process where ONE step has a subtle error. Return JSON:
{{"steps":["step1","step2","step3 (broken)","step4","step5"],"alteredIndex":2,"originalStep":"The correct version","alteredStep":"The broken version","explanation":"Why it fails"}}"""
    raw = _invoke_haiku(system, user, 400)
    result = _extract_json(raw)
    if not isinstance(result.get("steps"), list) or not isinstance(result.get("alteredIndex"), int):
        return {"error": "Invalid AI response"}
    return result


HANDLERS = {
    "misconception": _handle_misconception,
    "pushback": _handle_pushback,
    "score": _handle_score,
    "mastery_scenario": _handle_mastery_scenario,
    "mastery_score": _handle_mastery_score,
    "broken_config": _handle_broken_config,
}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        body = json.loads(event.get("body", "{}"))
    except (json.JSONDecodeError, TypeError):
        return api_response(400, {"error": "Invalid JSON body"}, event)

    action = body.get("action", "")
    if action not in ACTIONS:
        return api_response(400, {"error": f"Invalid action: {action}. Valid: {', '.join(sorted(ACTIONS))}"}, event)

    handler = HANDLERS.get(action)
    if not handler:
        return api_response(400, {"error": f"No handler for action: {action}"}, event)

    try:
        result = handler(body)
        if "error" in result:
            return api_response(422, result, event)
        return api_response(200, result, event)
    except Exception as e:
        return api_response(500, {"error": f"AI generation failed: {str(e)}"}, event)
