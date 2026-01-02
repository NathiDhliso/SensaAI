import { describe, it, expect } from 'vitest';
import { parseGeneratedContent } from './parser';

describe('parseGeneratedContent', () => {
    it('should parse content with PREPARE/MODEL/DELIVER lifecycle (PL-300 format)', () => {
        const content = `
================================================================================
VISUAL MASTER CHART: PL-300 Test
================================================================================

DOMAIN ANALYSIS
---------------
Domain: Business Intelligence & Data Analytics
Professional Role: Power BI Data Analyst
Lifecycle: PREPARE → MODEL → DELIVER

Source Verification: Microsoft Learn

Core Concepts Identified: 2
  1. Power BI Service
  2. DAX Measures

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Power BI Service

- PREPARE:
  • Prerequisite: Power BI Pro license required for workspaces
  • Selection: Choose between Workspace vs My Workspace based on collaboration needs
  • Execution: Navigate to app.powerbi.com and create new workspace

• MODEL:
  • Workspace Access Role: Admin has full control
  • **[Critical Distinction]:** Workspace supports collaboration vs My Workspace is personal only
  • **[Design Boundary]:** Maximum 1000 workspaces per tenant

○ DELIVER:
  • Tool: Power BI Service Admin Portal
  • Metric: Check workspace capacity utilization < 80%
  • Validation: Confirm deployment pipeline shows correct stage

## 2. DAX Measures

- PREPARE:
  • Prerequisite: Data model with at least one fact table
  • Selection: Choose between Measure vs Calculated Column based on requirements
  • Execution: Home tab > New Measure > Enter DAX formula

• MODEL:
  • Measure Syntax: Total Sales = SUM(Sales[Amount])
  • **[Critical Distinction]:** Measures evaluate at query time vs Calculated Columns at refresh
  • **[Exam Focus]:** Understand filter context propagation

○ DELIVER:
  • Tool: Performance Analyzer to measure query duration
  • Metric: DAX query time should be < 120ms
  • Validation: Test measure in different filter contexts

================================================================================
VISUAL MENTAL ANCHORS
================================================================================

### Anchor 1: Power BI as a Control Tower
Imagine an airport control tower managing data traffic.

**Why It Helps:** Makes abstract data concepts tangible.

================================================================================
LEARNING PATH SEQUENCE
================================================================================

### Stage 1: Foundation
**Concepts:** Power BI Service, DAX Measures
**Capabilities Gained:** Basic understanding of Power BI components
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.domainAnalysis.lifecycle.phase1).toBe('PREPARE');
            expect(result.data.domainAnalysis.lifecycle.phase2).toBe('MODEL');
            expect(result.data.domainAnalysis.lifecycle.phase3).toBe('DELIVER');
            expect(result.data.concepts.length).toBe(2);
            expect(result.data.concepts[0].name).toBe('Power BI Service');
            expect(result.data.concepts[0].phase1.prerequisite).toContain('Power BI Pro license');
            expect(result.data.concepts[0].phase2.length).toBeGreaterThan(0);
            expect(result.data.concepts[0].phase3.tool).toContain('Power BI Service Admin Portal');
        }
    });

    it('should parse content with classic PROVISION/CONFIGURE/MONITOR lifecycle (backward compatibility)', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: IT/Cloud
Professional Role: Cloud Architect
Lifecycle: PROVISION → CONFIGURE → MONITOR

Core Concepts Identified: 1
  1. Virtual Machines

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Virtual Machines

- PROVISION:
  • Prerequisite: Azure subscription required
  • Selection: Choose VM size based on workload
  • Execution: Azure Portal > Create VM

• CONFIGURE:
  • Set up networking rules
  • **[Critical Distinction]:** Standard vs Premium SSD

○ MONITOR:
  • Tool: Azure Monitor
  • Metric: Check CPU utilization
  • Validation: Verify VM health

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.domainAnalysis.lifecycle.phase1).toBe('PROVISION');
            expect(result.data.domainAnalysis.lifecycle.phase2).toBe('CONFIGURE');
            expect(result.data.domainAnalysis.lifecycle.phase3).toBe('MONITOR');
            expect(result.data.concepts.length).toBe(1);
            expect(result.data.concepts[0].name).toBe('Virtual Machines');
        }
    });

    it('should parse content with custom lifecycle phases', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: Law
Professional Role: Legal Analyst
Lifecycle: RESEARCH → DRAFT → REVIEW

Core Concepts Identified: 1
  1. Contract Analysis

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Contract Analysis

- RESEARCH:
  • Prerequisite: Access to legal database
  • Selection: Choose jurisdiction
  • Execution: Begin precedent review

• DRAFT:
  • Draft initial findings
  • **[Critical Distinction]:** Binding vs non-binding clauses

○ REVIEW:
  • Tool: Document management system
  • Metric: Review turnaround time
  • Validation: Partner sign-off

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.domainAnalysis.lifecycle.phase1).toBe('RESEARCH');
            expect(result.data.domainAnalysis.lifecycle.phase2).toBe('DRAFT');
            expect(result.data.domainAnalysis.lifecycle.phase3).toBe('REVIEW');
            expect(result.data.concepts.length).toBe(1);
            expect(result.data.concepts[0].name).toBe('Contract Analysis');
            expect(result.data.concepts[0].phase1.prerequisite).toContain('legal database');
        }
    });

    it('should parse mnemonic data with tier, anchor, and story', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: Cloud Computing
Professional Role: Azure Administrator
Lifecycle: PROVISION → CONFIGURE → MONITOR

Core Concepts Identified: 1
  1. Virtual Network

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Virtual Network

- PROVISION:
  • Prerequisite: Azure subscription
  • Selection: Choose address space
  • Execution: Create VNet in portal

• CONFIGURE:
  • Set up subnets
  • Configure NSG rules

○ MONITOR:
  • Tool: Network Watcher
  • Metric: Check connectivity
  • Validation: Verify routing

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Foundation",
    "anchor": "Volcano 🌋",
    "story": "A colossal Volcano erupts with glowing data-lava, but the lava flows only into carved private channels, never mixing.",
    "parentConcept": null
  }
}
\`\`\`

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts.length).toBe(1);
            const concept = result.data.concepts[0];
            expect(concept.mnemonic).toBeDefined();
            expect(concept.mnemonic?.tier).toBe('Foundation');
            expect(concept.mnemonic?.anchor).toBe('Volcano 🌋');
            expect(concept.mnemonic?.story).toContain('colossal Volcano');
            expect(concept.mnemonic?.parentName).toBeUndefined();
        }
    });

    it('should resolve parentName to parentId in two-pass parsing', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: Cloud Networking
Professional Role: Azure Network Engineer
Lifecycle: PROVISION → CONFIGURE → MONITOR

Core Concepts Identified: 3
  1. Virtual Network
  2. Subnet
  3. Network Security Group

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Virtual Network

- PROVISION:
  • Prerequisite: Azure subscription
  • Selection: Address space planning
  • Execution: Create VNet

• CONFIGURE:
  • Configure DNS settings

○ MONITOR:
  • Tool: Network Watcher

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Foundation",
    "anchor": "Volcano 🌋",
    "story": "A massive Volcano with private lava channels.",
    "parentConcept": null
  }
}
\`\`\`

## 2. Subnet

- PROVISION:
  • Prerequisite: Virtual Network exists
  • Selection: CIDR range within VNet
  • Execution: Add subnet to VNet

• CONFIGURE:
  • Assign address range

○ MONITOR:
  • Tool: Network topology view

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Keystone",
    "anchor": "Subway Bench 🚇",
    "story": "A purple Subway Bench sits inside the Volcano's crater, channeling the lava flow.",
    "parentConcept": "Virtual Network"
  }
}
\`\`\`

## 3. Network Security Group

- PROVISION:
  • Prerequisite: Subnet to associate
  • Selection: Inbound/outbound rules
  • Execution: Create NSG

• CONFIGURE:
  • Define security rules

○ MONITOR:
  • Tool: NSG flow logs

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Keystone",
    "anchor": "Night Guard 👮",
    "story": "A muscular Night Guard sleeps on the Subway Bench, instantly waking to check badges.",
    "parentConcept": "Subnet"
  }
}
\`\`\`

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts.length).toBe(3);

            // Concept 1: VNet (Foundation, no parent)
            const vnet = result.data.concepts[0];
            expect(vnet.name).toBe('Virtual Network');
            expect(vnet.mnemonic?.tier).toBe('Foundation');
            expect(vnet.mnemonic?.anchor).toBe('Volcano 🌋');
            expect(vnet.mnemonic?.parentId).toBeUndefined();

            // Concept 2: Subnet (Keystone, parent = VNet)
            const subnet = result.data.concepts[1];
            expect(subnet.name).toBe('Subnet');
            expect(subnet.mnemonic?.tier).toBe('Keystone');
            expect(subnet.mnemonic?.anchor).toBe('Subway Bench 🚇');
            expect(subnet.mnemonic?.parentName).toBe('Virtual Network');
            expect(subnet.mnemonic?.parentId).toBe(vnet.id); // TWO-PASS RESOLUTION

            // Concept 3: NSG (Keystone, parent = Subnet)
            const nsg = result.data.concepts[2];
            expect(nsg.name).toBe('Network Security Group');
            expect(nsg.mnemonic?.tier).toBe('Keystone');
            expect(nsg.mnemonic?.anchor).toBe('Night Guard 👮');
            expect(nsg.mnemonic?.parentName).toBe('Subnet');
            expect(nsg.mnemonic?.parentId).toBe(subnet.id); // TWO-PASS RESOLUTION
        }
    });

    it('should handle missing mnemonic gracefully (backward compatibility)', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: Testing
Professional Role: QA Engineer
Lifecycle: PLAN → EXECUTE → REPORT

Core Concepts Identified: 1
  1. Test Case

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Test Case

- PLAN:
  • Prerequisite: Requirements document
  • Selection: Test type
  • Execution: Write test steps

• EXECUTE:
  • Run tests

○ REPORT:
  • Tool: Test management tool
  • Metric: Pass rate

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts.length).toBe(1);
            // No mnemonic in old content - should not crash
            expect(result.data.concepts[0].mnemonic).toBeUndefined();
            expect(result.data.concepts[0].name).toBe('Test Case');
        }
    });

    it('should extract emoji from anchor string correctly', () => {
        const content = `
DOMAIN ANALYSIS
---------------
Domain: Cloud Storage
Professional Role: Storage Admin
Lifecycle: PROVISION → CONFIGURE → MONITOR

Core Concepts Identified: 2
  1. Storage Account
  2. SAS Token

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

## 1. Storage Account

- PROVISION:
  • Prerequisite: Resource group
  • Selection: Performance tier
  • Execution: Create storage account

• CONFIGURE:
  • Set replication

○ MONITOR:
  • Tool: Storage metrics

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Foundation",
    "anchor": "Skyscraper 🏢",
    "story": "A gleaming Skyscraper with infinite floors, each floor a different storage container.",
    "parentConcept": null
  }
}
\`\`\`

## 2. SAS Token

- PROVISION:
  • Prerequisite: Storage Account
  • Selection: Permissions and expiry
  • Execution: Generate token

• CONFIGURE:
  • Set allowed IPs

○ MONITOR:
  • Tool: Access logs

**Mnemonic:**
\`\`\`json
{
  "mnemonic": {
    "tier": "Utility",
    "anchor": "Secret Key 🔑",
    "story": "A tiny glowing Secret Key with an hourglass embedded unlocks the Skyscraper doors but melts at midnight.",
    "parentConcept": "Storage Account"
  }
}
\`\`\`

================================================================================
VISUAL MENTAL ANCHORS
================================================================================
`;

        const result = parseGeneratedContent(content);

        expect(result.success).toBe(true);
        if (result.success) {
            // Foundation tier
            const storage = result.data.concepts[0];
            expect(storage.mnemonic?.tier).toBe('Foundation');
            expect(storage.mnemonic?.anchor).toContain('🏢');

            // Utility tier with parent reference
            const sas = result.data.concepts[1];
            expect(sas.mnemonic?.tier).toBe('Utility');
            expect(sas.mnemonic?.anchor).toContain('🔑');
            expect(sas.mnemonic?.parentName).toBe('Storage Account');
            expect(sas.mnemonic?.parentId).toBe(storage.id);
        }
    });
});
