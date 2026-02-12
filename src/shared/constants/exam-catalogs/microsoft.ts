import type { CertEntry } from './types';

export const MICROSOFT_CERTS: CertEntry[] = [
  {
    id: 'az-900',
    name: 'Microsoft Azure Fundamentals',
    code: 'AZ-900',
    provider: 'Microsoft',
    level: 'Foundational',
    domains: [
      {
        name: 'Describe Cloud Concepts',
        weight: 25,
        tasks: [
          'Define cloud computing',
          'Describe the shared responsibility model',
          'Define cloud models including public, private, and hybrid',
          'Identify appropriate use cases for each cloud model',
          'Describe the consumption-based model',
          'Compare cloud pricing models',
          'Describe serverless computing',
        ],
      },
      {
        name: 'Describe Azure Architecture and Services',
        weight: 35,
        tasks: [
          'Describe the core architectural components of Azure',
          'Describe Azure regions, region pairs, and sovereign regions',
          'Describe availability zones',
          'Describe Azure datacenters',
          'Describe Azure resources and resource groups',
          'Describe subscriptions and management groups',
          'Describe Azure compute and networking services',
          'Describe Azure storage services',
          'Describe Azure identity, access, and security',
        ],
      },
      {
        name: 'Describe Azure Management and Governance',
        weight: 30,
        tasks: [
          'Describe cost management in Azure',
          'Describe features and tools in Azure for governance and compliance',
          'Describe features and tools for managing and deploying Azure resources',
          'Describe monitoring tools in Azure',
        ],
      },
    ],
  },
  {
    id: 'ai-900',
    name: 'Microsoft Azure AI Fundamentals',
    code: 'AI-900',
    provider: 'Microsoft',
    level: 'Foundational',
    domains: [
      {
        name: 'Describe Artificial Intelligence Workloads and Considerations',
        weight: 15,
        tasks: [
          'Identify features of common AI workloads',
          'Identify guiding principles for responsible AI',
        ],
      },
      {
        name: 'Describe Fundamental Principles of Machine Learning on Azure',
        weight: 20,
        tasks: [
          'Identify common machine learning techniques',
          'Describe core machine learning concepts',
          'Describe Azure Machine Learning capabilities',
        ],
      },
      {
        name: 'Describe Features of Computer Vision Workloads on Azure',
        weight: 15,
        tasks: [
          'Identify common types of computer vision solution',
          'Identify Azure tools and services for computer vision tasks',
        ],
      },
      {
        name: 'Describe Features of Natural Language Processing Workloads on Azure',
        weight: 15,
        tasks: [
          'Identify features of common NLP workload scenarios',
          'Identify Azure tools and services for NLP workloads',
        ],
      },
      {
        name: 'Describe Features of Generative AI Workloads on Azure',
        weight: 15,
        tasks: [
          'Identify features of generative AI solutions',
          'Identify capabilities of Azure OpenAI Service',
        ],
      },
    ],
  },
  {
    id: 'dp-900',
    name: 'Microsoft Azure Data Fundamentals',
    code: 'DP-900',
    provider: 'Microsoft',
    level: 'Foundational',
    domains: [
      {
        name: 'Describe Core Data Concepts',
        weight: 25,
        tasks: [
          'Describe ways to represent data',
          'Identify options for data storage',
          'Describe common data workloads',
          'Identify roles and responsibilities for data workloads',
        ],
      },
      {
        name: 'Identify Considerations for Relational Data on Azure',
        weight: 25,
        tasks: [
          'Describe relational concepts',
          'Describe normalization and why it is used',
          'Identify common structured query language (SQL) statements',
          'Describe Azure services for relational data',
        ],
      },
      {
        name: 'Describe Considerations for Working with Non-Relational Data on Azure',
        weight: 25,
        tasks: [
          'Describe capabilities of Azure storage',
          'Describe capabilities of Azure Cosmos DB',
        ],
      },
      {
        name: 'Describe an Analytics Workload on Azure',
        weight: 25,
        tasks: [
          'Describe common elements of large-scale analytics',
          'Describe considerations for real-time data analytics',
          'Describe data visualization in Microsoft Power BI',
        ],
      },
    ],
  },
  {
    id: 'sc-900',
    name: 'Microsoft Security, Compliance, and Identity Fundamentals',
    code: 'SC-900',
    provider: 'Microsoft',
    level: 'Foundational',
    domains: [
      {
        name: 'Describe the Concepts of Security, Compliance, and Identity',
        weight: 10,
        tasks: [
          'Describe security and compliance concepts',
          'Define identity concepts',
        ],
      },
      {
        name: 'Describe the Capabilities of Microsoft Entra',
        weight: 25,
        tasks: [
          'Describe the function and identity types of Microsoft Entra ID',
          'Describe the authentication capabilities of Microsoft Entra ID',
          'Describe access management capabilities of Microsoft Entra ID',
          'Describe the identity protection and governance capabilities of Microsoft Entra',
        ],
      },
      {
        name: 'Describe the Capabilities of Microsoft Security Solutions',
        weight: 35,
        tasks: [
          'Describe core infrastructure security services in Azure',
          'Describe security management capabilities of Azure',
          'Describe security capabilities of Microsoft Sentinel',
          'Describe threat protection with Microsoft Defender XDR',
        ],
      },
      {
        name: 'Describe the Capabilities of Microsoft Compliance Solutions',
        weight: 20,
        tasks: [
          'Describe Microsoft Service Trust Portal and privacy principles',
          'Describe the compliance management capabilities of Microsoft Purview',
          'Describe information protection, data lifecycle management, and data governance capabilities of Microsoft Purview',
          'Describe the insider risk capabilities of Microsoft Purview',
          'Describe the eDiscovery and audit capabilities of Microsoft Purview',
        ],
      },
    ],
  },
  {
    id: 'az-104',
    name: 'Microsoft Azure Administrator',
    code: 'AZ-104',
    provider: 'Microsoft',
    level: 'Associate',
    domains: [
      {
        name: 'Manage Azure Identities and Governance',
        weight: 20,
        tasks: [
          'Manage Microsoft Entra users and groups',
          'Manage access to Azure resources with Azure RBAC',
          'Manage Azure subscriptions and governance',
        ],
      },
      {
        name: 'Implement and Manage Storage',
        weight: 15,
        tasks: [
          'Configure access to storage',
          'Configure Azure Files and Azure Blob Storage',
          'Configure Azure Storage security',
        ],
      },
      {
        name: 'Deploy and Manage Azure Compute Resources',
        weight: 20,
        tasks: [
          'Automate deployment of resources by using Azure Resource Manager templates or Bicep files',
          'Create and configure virtual machines',
          'Provision and manage containers in Azure',
          'Create and configure Azure App Service',
        ],
      },
      {
        name: 'Implement and Manage Virtual Networking',
        weight: 15,
        tasks: [
          'Configure virtual networks and subnets',
          'Configure name resolution and secure access to virtual networks',
          'Configure load balancing',
          'Monitor virtual networking',
        ],
      },
      {
        name: 'Monitor and Maintain Azure Resources',
        weight: 10,
        tasks: [
          'Monitor resources by using Azure Monitor',
          'Implement backup and recovery for Azure resources',
        ],
      },
    ],
  },
  {
    id: 'az-204',
    name: 'Microsoft Azure Developer',
    code: 'AZ-204',
    provider: 'Microsoft',
    level: 'Associate',
    domains: [
      {
        name: 'Develop Azure Compute Solutions',
        weight: 25,
        tasks: [
          'Implement containerized solutions',
          'Implement Azure App Service Web Apps',
          'Implement Azure Functions',
        ],
      },
      {
        name: 'Develop for Azure Storage',
        weight: 15,
        tasks: [
          'Develop solutions that use Azure Cosmos DB',
          'Develop solutions that use Azure Blob Storage',
        ],
      },
      {
        name: 'Implement Azure Security',
        weight: 20,
        tasks: [
          'Implement user authentication and authorization',
          'Implement secure Azure solutions',
        ],
      },
      {
        name: 'Monitor, Troubleshoot, and Optimize Azure Solutions',
        weight: 15,
        tasks: [
          'Implement caching for solutions',
          'Troubleshoot solutions by using Application Insights',
        ],
      },
      {
        name: 'Connect to and Consume Azure Services and Third-party Services',
        weight: 15,
        tasks: [
          'Implement API Management',
          'Develop event-based solutions',
          'Develop message-based solutions',
        ],
      },
    ],
  },
  {
    id: 'az-305',
    name: 'Microsoft Azure Solutions Architect Expert',
    code: 'AZ-305',
    provider: 'Microsoft',
    level: 'Expert',
    domains: [
      {
        name: 'Design Identity, Governance, and Monitoring Solutions',
        weight: 25,
        tasks: [
          'Design solutions for logging and monitoring',
          'Design authentication and authorization solutions',
          'Design governance solutions',
        ],
      },
      {
        name: 'Design Data Storage Solutions',
        weight: 20,
        tasks: [
          'Design data storage solutions for relational data',
          'Design data storage solutions for non-relational data',
          'Design data integration solutions',
        ],
      },
      {
        name: 'Design Business Continuity Solutions',
        weight: 15,
        tasks: [
          'Design solutions for backup and disaster recovery',
          'Design for high availability',
        ],
      },
      {
        name: 'Design Infrastructure Solutions',
        weight: 30,
        tasks: [
          'Design compute solutions',
          'Design application architecture solutions',
          'Design network solutions',
          'Design migrations',
        ],
      },
    ],
  },
  {
    id: 'az-400',
    name: 'Microsoft DevOps Engineer Expert',
    code: 'AZ-400',
    provider: 'Microsoft',
    level: 'Expert',
    domains: [
      {
        name: 'Configure Processes and Communications',
        weight: 10,
        tasks: [
          'Configure activity traceability and flow of work',
          'Configure collaboration and communication',
        ],
      },
      {
        name: 'Design and Implement Source Control',
        weight: 15,
        tasks: [
          'Design and implement a source control strategy',
          'Plan and implement branching strategies for the source code',
          'Configure and manage repositories',
        ],
      },
      {
        name: 'Design and Implement Build and Release Pipelines',
        weight: 40,
        tasks: [
          'Design and implement pipeline automation',
          'Design and implement a package management strategy',
          'Design and implement pipelines for infrastructure as code',
          'Design and implement a deployment strategy',
        ],
      },
      {
        name: 'Develop a Security and Compliance Plan',
        weight: 10,
        tasks: [
          'Design and implement authentication and authorization methods',
          'Design and implement a strategy for managing sensitive information in automation',
        ],
      },
      {
        name: 'Implement an Instrumentation Strategy',
        weight: 10,
        tasks: [
          'Configure monitoring for a DevOps environment',
          'Analyze metrics from instrumentation',
        ],
      },
    ],
  },
];
