import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "lambda"))

from generate_concepts.services.bedrock_service import BedrockService

svc = BedrockService.__new__(BedrockService)

with open("test_output.json") as f:
    concepts = json.load(f)

print(f"Loaded {len(concepts)} concepts\n")

passed = 0
failed = 0
for c in concepts:
    name = c.get("name", "")
    level = c.get("treeLevel", "?")
    ok = svc._validate_concept(c)
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"  {status} [{level}] {name}")

print(f"\n{'='*60}")
print(f"VALIDATION: {passed} passed, {failed} failed out of {len(concepts)}")

print(f"\n{'='*60}")
print("MANUAL TEMPLATE CHECK:")
for c in concepts:
    name = c.get("name", "")
    p1 = c.get("phase1") or {}
    hook = (p1.get("hookSentence") or "").strip()
    meta = (p1.get("microMetaphor") or "").strip()
    why = (c.get("whyYouNeed") or "").strip()
    mn = c.get("mnemonic") or {}
    story = (mn.get("story") or "").strip()

    print(f"\n--- {name} ---")
    print(f"  hook template? {svc._is_template_content(hook, name)} | len={len(hook)}")
    print(f"    '{hook[:100]}'")
    print(f"  meta template? {svc._is_template_content(meta, name)} | len={len(meta)}")
    print(f"    '{meta[:100]}'")
    print(f"  why template? {svc._is_template_content(why, name)} | len={len(why)}")
    print(f"    '{why[:100]}'")
    print(f"  story template? {svc._is_template_content(story, name)} | len={len(story)}")
    print(f"    '{story[:100]}'")
    print(f"  story short? {svc._is_short_filler(story, 50)}")
