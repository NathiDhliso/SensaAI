import sys
sys.path.insert(0, "backend/lambda")
from generate_concepts.services.bedrock_service import BedrockService

svc = BedrockService.__new__(BedrockService)

tests = [
    "Why Virtual Networking matters in Azure Administrator",
    "Think of Virtual Networking as a building block",
    "Detailed explanation of Virtual networks are logically isolated networks in Azure",
    "Understanding Virtual Networking in the context of Azure Administrator",
    "Virtual Networking toolkit",
    "Effectiveness",
    "Scope: Stay focused",
    "Apply Virtual Networking in practice",
    "What is Virtual Networking?",
    "Proper use of Virtual Networking vs Common misunderstanding",
    "None",
    "Common misunderstanding",
    "Key exam topic for Virtual Networking",
    "When to use Virtual Networking",
]

print("Testing _is_template_content against user's output patterns:\n")
for t in tests:
    result = svc._is_template_content(t, "Virtual Networking")
    print(f"  {'CAUGHT' if result else 'MISSED':6} | {t}")

print("\n\nNow testing a full fake concept matching the user's output:")
fake_concept = {
    "name": "Virtual Networking",
    "treeLevel": "trunk",
    "parentName": None,
    "trunkDomain": "Virtual Networking",
    "cognitiveLevel": "understand",
    "commonPitfalls": [],
    "workedExample": {"steps": []},
    "mnemonic": {
        "anchor": "Virtual Networking",
        "story": "Understanding Virtual Networking in the context of Azure Administrator"
    },
    "phase1": {
        "hookSentence": "Why Virtual Networking matters in Azure Administrator",
        "microMetaphor": "Think of Virtual Networking as a building block",
        "prerequisite": "None",
        "selection": ["What is Virtual Networking?", "When to use Virtual Networking"],
        "execution": "Apply Virtual Networking in practice"
    },
    "phase2": [
        {"title": "Key Points", "content": "Detailed explanation of Virtual networks are logically isolated networks in Azure"}
    ],
    "phase3": {
        "tool": "Virtual Networking toolkit",
        "metrics": ["Effectiveness", "Efficiency"]
    },
    "whyYouNeed": "Why Virtual Networking matters in Azure Administrator",
    "shape": {
        "simpleCore": "Virtual networks are logically isolated networks in Azure",
        "patternRecognition": {"question": "", "answer": ""},
        "highStakesExample": "Some example"
    },
    "criticalDistinctions": [{"correct": "Proper use of Virtual Networking", "incorrect": "Common misunderstanding"}],
    "examFocus": [{"topic": "Key exam topic for Virtual Networking", "weight": "High"}],
    "designBoundaries": [{"boundary": "Scope: Stay focused", "rationale": ""}],
    "connections": [{"target": "Network Security", "relationship": "enables", "description": "test"}]
}

result = svc._validate_concept(fake_concept)
print(f"\n  Full concept validation: {'PASS (BUG!)' if result else 'FAIL (correct)'}")
