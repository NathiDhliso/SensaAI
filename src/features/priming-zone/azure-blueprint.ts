/**
 * Azure Administration Blueprint
 * Hardcoded seed data for testing the Futuristic Priming Zone
 */

import type { ConceptMatrix, AtomicConcept, MatrixCell } from './types';

// Y-Axis: Azure Concepts with nested hierarchy
const azureConcepts: AtomicConcept[] = [
  {
    id: 'identity',
    name: 'Identity',
    children: [
      { id: 'identity-users', name: 'Users' },
      { id: 'identity-groups', name: 'Groups' },
      { id: 'identity-rbac', name: 'RBAC Roles' },
    ],
  },
  {
    id: 'networking',
    name: 'Networking',
    children: [
      { id: 'networking-vnet', name: 'Virtual Network' },
      { id: 'networking-nsg', name: 'Network Security Group' },
      { id: 'networking-peering', name: 'VNet Peering' },
    ],
  },
  {
    id: 'compute',
    name: 'Compute',
    children: [
      { id: 'compute-vm', name: 'Virtual Machine' },
      { id: 'compute-scale-set', name: 'VM Scale Set' },
      { id: 'compute-app-service', name: 'App Service' },
    ],
  },
  {
    id: 'storage',
    name: 'Storage',
    children: [
      { id: 'storage-account', name: 'Storage Account' },
      { id: 'storage-blob', name: 'Blob Container' },
      { id: 'storage-keys', name: 'Access Keys' },
    ],
  },
];

// Matrix Cells: Sample intersections with Priming Cards
const azureMatrixCells: MatrixCell[] = [
  // ── STORAGE ACCOUNT × CREATE ──────────────────────────────────────────────
  {
    action: 'CREATE',
    conceptId: 'storage-account',
    conceptPath: ['Storage', 'Storage Account'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'Storage accounts follow the "Name-Region-Redundancy" trinity. Think: WHERE you store, HOW redundant, WHAT name (globally unique).',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'Active Azure subscription',
          'Resource group must exist in target region',
          'Unique storage account name (3-24 chars, lowercase, no hyphens)',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Portal → Search "Storage accounts"',
          'Click "+ Create"',
          'Select subscription + resource group',
          'Enter unique storage account name',
          'Select region',
          'Choose performance tier (Standard/Premium)',
          'Select redundancy (LRS/GRS/ZRS)',
          'Review + Create',
        ],
      },
    },
  },

  // ── STORAGE ACCOUNT × CONFIGURE ───────────────────────────────────────────
  {
    action: 'CONFIGURE',
    conceptId: 'storage-account',
    conceptPath: ['Storage', 'Storage Account'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'The "5-Tab Rule": Configuration, Networking, Data protection, Encryption, Access keys. Always left-to-right.',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'Storage account must be created',
          'Appropriate permissions (Storage Account Contributor)',
          'No active locks on the resource',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Navigate to storage account',
          'Left menu → "Configuration"',
          'Modify settings (e.g., enable hierarchical namespace)',
          'Left menu → "Networking"',
          'Configure firewall rules',
          'Left menu → "Data protection"',
          'Enable soft delete, versioning',
          'Save changes',
        ],
      },
    },
  },

  // ── STORAGE ACCOUNT × MONITOR ─────────────────────────────────────────────
  {
    action: 'MONITOR',
    conceptId: 'storage-account',
    conceptPath: ['Storage', 'Storage Account'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'Metrics live in "Monitoring" section. Think: Capacity (how full), Transactions (how busy), Availability (how healthy).',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'Storage account exists',
          'Monitoring Reader role or higher',
          'Metrics retention period configured',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Navigate to storage account',
          'Left menu → "Monitoring" section',
          'Click "Metrics"',
          'Select metric scope (Account/Blob/File/Queue)',
          'Add metric (e.g., "Used capacity")',
          'Set time range',
          'Apply filters if needed',
          'Pin to dashboard (optional)',
        ],
      },
    },
  },

  // ── VIRTUAL MACHINE × CREATE ──────────────────────────────────────────────
  {
    action: 'CREATE',
    conceptId: 'compute-vm',
    conceptPath: ['Compute', 'Virtual Machine'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'VM creation is a "Wizard of 5": Basics, Disks, Networking, Management, Review. Each tab unlocks the next.',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'Active subscription with available quota',
          'Resource group exists',
          'Virtual network + subnet exist',
          'SSH key or password prepared',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Portal → "Virtual machines"',
          'Click "+ Create" → "Azure virtual machine"',
          'Basics: Select subscription, RG, name, region, image',
          'Choose VM size',
          'Set authentication (SSH/password)',
          'Disks: Select OS disk type',
          'Networking: Choose VNet, subnet, public IP',
          'Management: Enable monitoring (optional)',
          'Review + Create',
        ],
      },
    },
  },

  // ── VIRTUAL MACHINE × CONFIGURE ───────────────────────────────────────────
  {
    action: 'CONFIGURE',
    conceptId: 'compute-vm',
    conceptPath: ['Compute', 'Virtual Machine'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'Post-creation config follows "SNAP": Size, Networking, Availability, Protection. Always stop VM before resizing.',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'VM must be created',
          'VM Contributor role',
          'VM must be stopped for size changes',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Navigate to VM',
          'Stop VM (if resizing)',
          'Left menu → "Size"',
          'Select new size → Save',
          'Left menu → "Networking"',
          'Add/modify network interfaces',
          'Left menu → "Disks"',
          'Attach additional data disks',
          'Start VM',
        ],
      },
    },
  },

  // ── VIRTUAL MACHINE × MONITOR ─────────────────────────────────────────────
  {
    action: 'MONITOR',
    conceptId: 'compute-vm',
    conceptPath: ['Compute', 'Virtual Machine'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'VM health = "CPU + Memory + Disk + Network". All 4 must be green. Check "Metrics" for trends, "Insights" for anomalies.',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'VM exists and is running',
          'Azure Monitor agent installed (for guest metrics)',
          'Monitoring Reader role',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Navigate to VM',
          'Left menu → "Monitoring" → "Metrics"',
          'Add metric: "Percentage CPU"',
          'Add metric: "Network In/Out"',
          'Add metric: "Disk Read/Write Bytes"',
          'Set time range (e.g., Last 24 hours)',
          'Left menu → "Insights" (for VM Insights)',
          'Review performance trends',
        ],
      },
    },
  },

  // ── VIRTUAL NETWORK × CREATE ──────────────────────────────────────────────
  {
    action: 'CREATE',
    conceptId: 'networking-vnet',
    conceptPath: ['Networking', 'Virtual Network'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'VNets are "Address Space + Subnets". Think: Big CIDR block (e.g., 10.0.0.0/16), then carve subnets (e.g., 10.0.1.0/24).',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'Active subscription',
          'Resource group exists',
          'Non-overlapping CIDR range with existing VNets',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Portal → "Virtual networks"',
          'Click "+ Create"',
          'Select subscription + resource group',
          'Enter VNet name',
          'Select region',
          'Enter address space (e.g., 10.0.0.0/16)',
          'Add subnet (name + CIDR, e.g., 10.0.1.0/24)',
          'Review + Create',
        ],
      },
    },
  },

  // ── RBAC ROLES × CONFIGURE ────────────────────────────────────────────────
  {
    action: 'CONFIGURE',
    conceptId: 'identity-rbac',
    conceptPath: ['Identity', 'RBAC Roles'],
    primingCard: {
      trick: {
        title: '🧠 The Trick',
        content: 'RBAC = "Who + What + Where". User/Group (who), Role (what permissions), Scope (subscription/RG/resource).',
      },
      chain: {
        title: '🔗 The Chain',
        constraints: [
          'User Access Administrator or Owner role',
          'Target user/group exists in Azure AD',
          'Target scope (subscription/RG/resource) exists',
        ],
      },
      steps: {
        title: '⚡ Atomic Steps',
        actions: [
          'Navigate to target scope (subscription/RG/resource)',
          'Left menu → "Access control (IAM)"',
          'Click "+ Add" → "Add role assignment"',
          'Select role (e.g., "Contributor")',
          'Click "Next"',
          'Click "+ Select members"',
          'Search and select user/group',
          'Click "Review + assign"',
        ],
      },
    },
  },
];

export const azureBlueprint: ConceptMatrix = {
  concepts: azureConcepts,
  cells: azureMatrixCells,
  domain: 'Azure Administration',
  version: '1.0.0',
};
