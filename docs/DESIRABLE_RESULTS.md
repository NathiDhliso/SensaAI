# Desirable Results — Generated Content Quality Guide

**Last Updated:** February 20, 2026

What each field in a generated concept should look like, using AZ-104 "Network Security Groups" as the reference example.

---

## What Lambda Returns Per Concept

Lambda returns a JSON array of concepts. Below is what a **good** result looks like vs. a **bad** one.

### Core Identity

| Field | Good | Bad |
|-------|------|-----|
| `name` | "Network Security Groups (NSGs)" | "concept-P1-003" or "Security" |
| `cognitiveLevel` | "apply" | missing or "remember" for a config concept |
| `order` | 12 | missing or 0 |
| `commonPitfalls` | ["NSGs are stateful — return traffic is automatically allowed", "Lower priority number = higher priority (100 beats 200)"] | [] or missing |

**Rules:**
- `name` must be human-readable, specific, and learnable in 5-10 minutes
- Configuration/troubleshooting concepts must be `apply` or higher — never `remember`

---

### Engagement — phase1

```json
{
  "hookSentence": "Capital One's 2019 breach exposed 100 million records through a single misconfigured WAF rule — the same NSG priority mistake costs Azure administrators their jobs every week.",
  "microMetaphor": "An NSG is a building security desk — rules are the visitor policy, inbound is arrivals, outbound is departures, and priority numbers are the VIP queue.",
  "prerequisite": "Virtual Networks, Subnets",
  "selection": [
    "When filtering traffic at subnet level → Apply NSG to subnet → Unlocks bulk protection for all VMs in that subnet",
    "When needing per-VM rules → Apply NSG to NIC → Unlocks granular control per individual machine"
  ],
  "execution": "Create NSG → Define inbound/outbound rules by priority → Associate to subnet or NIC → Test with Network Watcher → Monitor flow logs"
}
```

| Field | Good | Bad |
|-------|------|-----|
| `hookSentence` | Specific real event, creates urgency, names real consequence | "NSGs are important for security." — BANNED pattern |
| `microMetaphor` | Concrete object outside the domain (security desk, guest list) | "NSGs are like a firewall" (same domain) |
| `prerequisite` | Names actual other concepts in the set | "None" for everything, or "Basic knowledge" |
| `selection` | Follows "When [scenario] → [option] → Unlocks [capability]" | Generic bullet points with no decision logic |
| `execution` | Step-by-step action sequence a practitioner would follow | "Use NSGs to secure your network" (vague) |

**BANNED hookSentence patterns:**
- "Without proper X..."
- "Without X..."
- "Improperly configured X..."
- "X is crucial/critical/essential..."
- "X provides a secure way..."

---

### Memory — mnemonic

```json
{
  "anchor": "Nightclub Bouncer 🎤",
  "story": "The Bouncer (NSG) stands at the Door (subnet). He checks the Guest List (rules) sorted by VIP number (priority). Lower numbers get checked first — VIP 100 beats regular 200. If your name isn't on the list, you're turned away (default deny). The bouncer remembers who he let in, so their friends can leave freely (stateful)."
}
```

| Field | Good | Bad |
|-------|------|-----|
| `anchor` | Concrete physical object with emoji | Abstract concept ("Security System") or just the concept name |
| `story` | Maps concept parts to physical parts with spatial language | "NSGs help you remember security rules" (no mapping) |

**Rule:** Every concept must have a **unique** anchor. Duplicate anchors across concepts are flagged by `_enforce_unique_content()`.

---

### Understanding — keyPoints

```json
["NSGs are stateful — return traffic is automatically allowed",
 "Priority 100 beats 200 — lower number wins",
 "Associate to subnet (bulk) or NIC (per-VM)",
 "Default rules allow VNet traffic and deny internet inbound",
 "Network Watcher flow logs show which rule matched each packet"]
```

5 points maximum. Each must be a standalone, testable fact — not a restatement of the concept name.

---

### Understanding — shape (5 lenses)

```json
{
  "simpleCore": "NSGs filter inbound and outbound traffic using priority-ordered rules — lower number wins, and the first match wins.",
  "highStakesExample": "Microsoft Azure ChaosDB (2021) — researchers gained full admin access to Cosmos DB accounts of thousands of Azure customers by exploiting a misconfigured Jupyter Notebook feature. The attack succeeded because NSG rules allowed unexpected inbound traffic to internal services.",
  "analogicalModel": "An NSG is a building security desk — rules are the visitor policy sorted by VIP level (priority), inbound is the arrivals queue, outbound is departures, and the default policy turns away anyone not on the list.",
  "patternRecognition": {
    "question": "An NSG has rules: Allow-HTTP (priority 100), Deny-All-Inbound (priority 200), Allow-HTTPS (priority 150). A request arrives on port 443. Which rule applies?",
    "answer": "Allow-HTTP (priority 100) is checked first but doesn't match port 443. Allow-HTTPS (priority 150) matches port 443 — traffic is allowed. Deny-All-Inbound (priority 200) is never reached because the first match wins."
  },
  "eliminationLogic": "Stateful question → NSGs (not Azure Firewall). Subnet-level filtering → NSG on subnet. Per-VM filtering → NSG on NIC. Priority conflict → lower number wins. Default behavior → VNet traffic allowed, internet inbound denied."
}
```

| Lens | Good | Bad |
|------|------|-----|
| `simpleCore` | One sentence, zero jargon, irreducible idea | Restates the concept name or uses domain jargon |
| `highStakesExample` | Real company + year + specific technical detail | Generic "a company lost data" — BANNED |
| `analogicalModel` | "[Concept] is [concrete system] — [precise part mapping]" | "Think of X as..." — BANNED pattern |
| `patternRecognition.question` | Specific scenario with named configs/values | "What is an NSG?" |
| `patternRecognition.answer` | Explains the reasoning chain, not just the answer | States the answer without explaining why |
| `eliminationLogic` | Actionable decision tree: "If X → eliminate Y because Z" | Restatement of the concept |

**Rule:** Every concept must have a **unique** `highStakesExample` company. Duplicate companies across concepts are flagged by `_enforce_unique_content()`.

**BANNED `analogicalModel` patterns:**
- "Think of X as..."
- "X is like a..."

**Correct format:** "X is/are [metaphor] — [how the mapping works]"

---

### Application — phase2 (plain strings)

```json
[
  "Stateful filtering: NSGs automatically allow return traffic for established connections — you only need to define the initiating direction.",
  "Rule evaluation: Rules are processed in priority order (lowest number first). The first matching rule wins — subsequent rules are not evaluated.",
  "Association scope: One NSG can be associated with multiple subnets and NICs. Changes to the NSG apply immediately to all associated resources."
]
```

**IMPORTANT:** `phase2` is an array of **plain strings** — NOT `{title, content}` objects. The LLM prompt now enforces this. If you see `{title, content}` objects in legacy data, the parser handles them by extracting `.content`.

---

### Application — phase3

```json
{
  "tool": "Network Watcher → NSG Flow Logs — captures which rule matched each packet with source/destination IP, port, and allow/deny decision",
  "metrics": [
    "Flow log hit count per rule — identifies unused rules and over-permissive rules",
    "Blocked traffic percentage — baseline for security posture monitoring"
  ],
  "thresholds": "Alert if default-deny rule hit rate drops below 5% (may indicate rules are too permissive)"
}
```

---

### Creator's Blueprint — perspectives

```json
[
  {
    "label": "Portal",
    "blueprint": "Navigate to NSG blade → Inbound security rules → Add rule → set priority, protocol, source, destination, action",
    "steps": [
      "Search 'Network security groups' in Azure Portal",
      "Select NSG → Inbound security rules → + Add",
      "Set Priority (100-4096), Protocol (TCP/UDP/Any), Source (IP/Service Tag/ASG)",
      "Set Destination port ranges (e.g. 443), Action (Allow/Deny)",
      "Click Add — rule takes effect within seconds"
    ]
  },
  {
    "label": "CLI",
    "blueprint": "az network nsg rule create with --priority, --access Allow, --direction Inbound, --protocol Tcp",
    "steps": [
      "az network nsg rule create --resource-group MyRG --nsg-name MyNSG --name AllowHTTPS",
      "--priority 150 --direction Inbound --access Allow",
      "--protocol Tcp --source-address-prefixes '*' --source-port-ranges '*'",
      "--destination-address-prefixes '*' --destination-port-ranges 443"
    ]
  },
  {
    "label": "Terraform",
    "blueprint": "Declare azurerm_network_security_rule resource, reference security_group_name, set direction/access/priority attributes",
    "steps": [
      "resource \"azurerm_network_security_rule\" \"allow_https\" {",
      "  name = \"AllowHTTPS\"; priority = 150; direction = \"Inbound\"; access = \"Allow\"",
      "  protocol = \"Tcp\"; source_port_range = \"*\"; destination_port_range = \"443\"",
      "  source_address_prefix = \"*\"; destination_address_prefix = \"*\"",
      "  resource_group_name = azurerm_resource_group.main.name",
      "  network_security_group_name = azurerm_network_security_group.main.name }"
    ]
  }
]
```

**Label guidance by subject type:**
- **Azure/AWS/GCP (procedural):** Portal, CLI, Terraform, ARM/Bicep, PowerShell
- **Coding (procedural):** Imperative, Declarative, Functional, OOP
- **Medical/surgical (procedural):** Assessment, Intervention, Verification
- **Law (conceptual):** Plaintiff's Argument, Defendant's Argument, Court's Reasoning
- **Finance (conceptual):** Micro View, Macro View, Risk Lens
- **Music theory (conceptual):** Harmonic, Melodic, Rhythmic
- **Design/research/agile (cyclic):** Diverge, Converge, Reflect
- **Diagnosis/chess/art (perceptual):** Pattern Recognition, Differential, Confirmation

---

### Connections

```json
[
  { "target": "Virtual Network Infrastructure", "type": "is-part-of" },
  { "target": "Azure Firewall and Advanced Security", "type": "requires" },
  { "target": "Network Watcher Diagnostics", "type": "causes" }
]
```

**Graph topology rules:**
- Trunk: 0 outgoing connections
- Branch: max 2 (1 `is-part-of` → trunk + 0-1 `requires` → sibling branch)
- Leaf: max 3 (1 `is-part-of` → branch + 1-2 same-branch connections)
- Cross-branch leaf connections: **FORBIDDEN**
- `requires` must point to a lower `order` number (no cycles)

---

## Common Quality Failures

| Failure | Example | Fix |
|---------|---------|-----|
| Generic hookSentence | "Without proper NSG configuration, your network is vulnerable." | Use real incident: "Capital One (2019) — misconfigured WAF rule exposed 100M records" |
| Same-domain metaphor | "NSGs are like a firewall" | Use outside-domain object: "NSG is a building security desk" |
| Empty commonPitfalls | `[]` | Must have 2+ specific misconceptions learners actually hold |
| Vague execution | "Configure NSG rules as needed" | Step-by-step: "Create NSG → Define rules by priority → Associate to subnet → Test" |
| Duplicate mnemonic anchor | "Three-Story Building" used for 3 concepts | Each concept needs a unique physical object |
| Duplicate highStakesExample | Capital One used for 4 Azure concepts | Each concept needs a different company/incident |
| phase2 as objects | `[{"title": "Stateful", "content": "..."}]` | Must be plain strings: `["Stateful: NSGs automatically allow..."]` |
| Missing perspectives | `perspectives: []` | Every leaf concept must have 2-4 perspectives |
