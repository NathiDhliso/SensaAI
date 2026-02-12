import json
import sys
import os
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "lambda"))

from shared.system_prompt import get_tree_generation_prompt
import boto3
from botocore.config import Config

client = boto3.client(
    "bedrock-runtime",
    region_name="us-east-1",
    config=Config(retries={"max_attempts": 3, "mode": "adaptive"}, read_timeout=300),
)

MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"

domain = {
    "name": "Implement and manage storage",
    "weight": 0.175,
    "subtopics": [
        {"name": "Configure access to storage", "objectives": ["Configure Azure Storage firewalls and virtual networks", "Create and use shared access signature (SAS) tokens"]},
        {"name": "Configure Azure Blob Storage", "objectives": ["Create and configure a storage account", "Configure blob lifecycle management"]},
    ]
}

prompt = get_tree_generation_prompt(
    subject="Azure Administrator AZ-104",
    domain=domain,
    domain_index=0,
    total_domains=5,
    classification={"subjectType": "procedural", "connectiveTissue": {"gatewaySkill": "Azure Portal navigation and resource provisioning", "thresholdConcept": "Resource hierarchy: Management Group > Subscription > Resource Group > Resource", "signatureMove": "Diagnosing access and connectivity issues across identity, network, and storage layers"}},
)

split_marker = f'Generate the concept tree for "{domain["name"]}" now:'
idx = prompt.rfind(split_marker)
if idx > 0:
    system_msg = prompt[:idx].strip()
    user_msg = split_marker
else:
    system_msg = prompt
    user_msg = f'Generate the concept tree for "{domain["name"]}" now.'

user_msg += "\n\nIMPORTANT REMINDER: Every field must contain REAL technical content specific to the concept. Do NOT use placeholder patterns like 'Why X matters', 'Think of X as a building block', 'Detailed explanation of Y', 'Proper use of X vs Common misunderstanding', or empty Q/A fields. Concepts with generic filler will be rejected and you will be asked to regenerate. Write as if you are a subject matter expert authoring a study guide."

print(f"System message: {len(system_msg)} chars")
print(f"User message: {len(user_msg)} chars")
print("Calling Bedrock (60-120s)...")

response = client.invoke_model(
    modelId=MODEL_ID,
    contentType="application/json",
    accept="application/json",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 16384,
        "temperature": 0.3,
        "system": system_msg,
        "messages": [{"role": "user", "content": user_msg}],
    }),
)

response_body = json.loads(response.get("body").read())
raw = response_body.get("content", [])[0].get("text", "")
print(f"Response: {len(raw)} chars")

json_match = re.search(r'\[.*\]', raw, re.DOTALL)
if not json_match:
    print("ERROR: No JSON array found in response")
    print(raw[:2000])
    sys.exit(1)

concepts = json.loads(json_match.group())
print(f"Parsed {len(concepts)} concepts")

with open("test_output.json", "w") as f:
    json.dump(concepts, f, indent=2)
print("Saved raw output to test_output.json")

from generate_concepts.services.bedrock_service import BedrockService
svc = BedrockService.__new__(BedrockService)

passed = 0
failed = 0
for c in concepts:
    name = c.get("name", "")
    level = c.get("treeLevel", "?")
    ok = svc._validate_concept(c)
    if ok:
        passed += 1
        print(f"  PASS [{level}] {name}")
    else:
        failed += 1
        print(f"  FAIL [{level}] {name}")

print(f"\n{'='*60}")
print(f"VALIDATION: {passed} passed, {failed} failed out of {len(concepts)}")

print(f"\n{'='*60}")
print("FIELD DUMP (all concepts):")
for c in concepts:
    name = c.get("name", "")
    level = c.get("treeLevel", "?")
    p1 = c.get("phase1") or {}
    mn = c.get("mnemonic") or {}
    sh = c.get("shape") or {}
    pr = sh.get("patternRecognition") or {}
    p3 = c.get("phase3") or {}
    print(f"\n--- [{level}] {name} ---")
    print(f"  hookSentence: {(p1.get('hookSentence') or '')[:150]}")
    print(f"  microMetaphor: {(p1.get('microMetaphor') or '')[:150]}")
    print(f"  whyYouNeed: {(c.get('whyYouNeed') or '')[:150]}")
    print(f"  mnemonic.anchor: {(mn.get('anchor') or '')[:80]}")
    print(f"  mnemonic.story: {(mn.get('story') or '')[:150]}")
    print(f"  simpleCore: {(sh.get('simpleCore') or '')[:150]}")
    print(f"  patternQ: {(pr.get('question') or '')[:150]}")
    print(f"  patternA: {(pr.get('answer') or '')[:150]}")
    print(f"  phase3.tool: {(p3.get('tool') or '')[:100]}")
    print(f"  phase3.metrics: {(p3.get('metrics') or [])[:3]}")
    p2 = c.get("phase2") or []
    if isinstance(p2, list):
        for i, item in enumerate(p2[:2]):
            if isinstance(item, dict):
                print(f"  phase2[{i}].title: {item.get('title', '')[:80]}")
                print(f"  phase2[{i}].content: {item.get('content', '')[:120]}")
    crit = c.get("criticalDistinctions") or []
    if isinstance(crit, list):
        for i, item in enumerate(crit[:2]):
            if isinstance(item, dict):
                print(f"  crit[{i}].correct: {item.get('correct', '')[:100]}")
                print(f"  crit[{i}].incorrect: {item.get('incorrect', '')[:100]}")
