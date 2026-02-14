import type { CertEntry } from './types';

export const GOOGLE_CLOUD_CERTS: CertEntry[] = [
  {
    id: 'gcp-cdl',
    name: 'Google Cloud Digital Leader',
    code: 'CDL',
    provider: 'Google Cloud',
    level: 'Foundational',
    domains: [
      {
        name: 'Digital Transformation with Google Cloud',
        weight: 17,
        tasks: [
          'Explain why cloud technology is transforming business',
          'Explain the benefits of cloud technology to a business',
          'Describe the elements of digital transformation with Google Cloud',
          'Identify organizational change patterns required for cloud adoption',
          'Describe common modernization outcomes tied to business KPIs',
        ],
      },
      {
        name: 'Exploring Data Transformation with Google Cloud',
        weight: 23,
        tasks: [
          'Describe the value of data and how it creates business insights',
          'Identify Google Cloud solutions for data management',
          'Identify Google Cloud solutions for smart analytics',
          'Identify Google Cloud prebuilt ML model API services for generating business value',
          'Distinguish data lake, warehouse, and lakehouse usage patterns on Google Cloud',
          'Explain how data governance improves trust and decision velocity',
        ],
      },
      {
        name: 'Innovating with Google Cloud Artificial Intelligence',
        weight: 23,
        tasks: [
          'Recognize the AI/ML framework and describe its components on Google Cloud',
          'Identify how AI/ML adds value to Google Cloud products',
          'Describe Big Data and ML products on Google Cloud',
          'Describe responsible AI principles and risk controls in enterprise AI programs',
          'Identify generative AI use cases and evaluation considerations',
        ],
      },
      {
        name: 'Modernize Infrastructure and Applications with Google Cloud',
        weight: 20,
        tasks: [
          'Explain what cloud modernization means and its benefits',
          'Describe Google Cloud compute solutions and their benefits',
          'Describe containers and serverless options on Google Cloud',
          'Describe the value of APIs and the API management solutions on Google Cloud',
          'Compare migration, replatforming, and refactoring approaches',
          'Describe reliability and scalability patterns for cloud-native architectures',
        ],
      },
      {
        name: 'Trust and Security with Google Cloud',
        weight: 17,
        tasks: [
          'Describe the business value of Google security',
          'Identify today\'s top cybersecurity challenges and threats',
          'Describe Google Cloud\'s approach to security and how it addresses key challenges',
          'Explain how Google Cloud earns and maintains customer trust',
          'Describe shared responsibility boundaries across cloud service models',
          'Identify controls for identity, data protection, and compliance assurance',
        ],
      },
    ],
  },
  {
    id: 'gcp-ace',
    name: 'Google Cloud Associate Cloud Engineer',
    code: 'ACE',
    provider: 'Google Cloud',
    level: 'Associate',
    domains: [
      {
        name: 'Setting Up a Cloud Solution Environment',
        weight: 17,
        tasks: [
          'Set up cloud projects and accounts',
          'Manage billing configuration',
          'Install and configure the command-line interface (CLI), specifically the Cloud SDK',
          'Configure resource hierarchy with folders and organizations',
          'Set up baseline IAM roles and service accounts for projects',
        ],
      },
      {
        name: 'Planning and Configuring a Cloud Solution',
        weight: 17,
        tasks: [
          'Plan and estimate Google Cloud product use using the pricing calculator',
          'Plan and configure compute resources',
          'Plan and configure data storage options',
          'Plan and configure network resources',
          'Select regions and zones based on latency, resilience, and compliance needs',
          'Plan private connectivity and egress control patterns',
        ],
      },
      {
        name: 'Deploying and Implementing a Cloud Solution',
        weight: 25,
        tasks: [
          'Deploy and implement Compute Engine resources',
          'Deploy and implement Google Kubernetes Engine resources',
          'Deploy and implement Cloud Run and Cloud Functions resources',
          'Deploy and implement data solutions',
          'Deploy and implement networking resources',
          'Deploy a solution using Cloud Marketplace',
          'Implement resources via infrastructure as code',
        ],
      },
      {
        name: 'Ensuring Successful Operation of a Cloud Solution',
        weight: 20,
        tasks: [
          'Manage Compute Engine resources',
          'Manage Google Kubernetes Engine resources',
          'Manage Cloud Run resources',
          'Manage storage and database solutions',
          'Manage networking resources',
          'Monitor and log cloud resources',
        ],
      },
      {
        name: 'Configuring Access and Security',
        weight: 20,
        tasks: [
          'Manage Identity and Access Management (IAM)',
          'Manage service accounts',
          'View audit logs',
          'Apply least-privilege policies with conditional IAM bindings',
          'Implement key and secret management for workloads',
        ],
      },
    ],
  },
  {
    id: 'gcp-pca',
    name: 'Google Cloud Professional Cloud Architect',
    code: 'PCA',
    provider: 'Google Cloud',
    level: 'Professional',
    domains: [
      {
        name: 'Designing and Planning a Cloud Solution Architecture',
        weight: 24,
        tasks: [
          'Design a solution infrastructure that meets business requirements',
          'Design a solution infrastructure that meets technical requirements',
          'Design network, storage, and compute resources',
          'Create a migration plan',
          'Design for reliability targets and service-level objectives',
          'Design shared services and landing zone architecture patterns',
        ],
      },
      {
        name: 'Managing and Provisioning Solution Infrastructure',
        weight: 15,
        tasks: [
          'Configure network topologies',
          'Configure individual storage systems',
          'Configure compute systems',
        ],
      },
      {
        name: 'Designing for Security and Compliance',
        weight: 18,
        tasks: [
          'Design for security',
          'Design for compliance',
          'Design Identity and Access Management (IAM) for Google Cloud',
          'Design encryption, key lifecycle, and data sovereignty controls',
          'Design policy enforcement with organization policies and guardrails',
        ],
      },
      {
        name: 'Analyzing and Optimizing Technical and Business Processes',
        weight: 18,
        tasks: [
          'Analyze and define technical processes',
          'Analyze and define business processes',
          'Develop procedures to ensure reliability of solutions in production',
        ],
      },
      {
        name: 'Managing Implementation',
        weight: 11,
        tasks: [
          'Advise development/operation teams to ensure successful deployment of the solution',
          'Interact with Google Cloud using GCP SDK',
        ],
      },
      {
        name: 'Ensuring Solution and Operations Reliability',
        weight: 14,
        tasks: [
          'Monitor/log/profile/alert on solution',
          'Deployment and release management',
          'Assist with the support of deployed solutions',
        ],
      },
    ],
  },
  {
    id: 'gcp-pde',
    name: 'Google Cloud Professional Data Engineer',
    code: 'PDE',
    provider: 'Google Cloud',
    level: 'Professional',
    domains: [
      {
        name: 'Design Data Processing Systems',
        weight: 22,
        tasks: [
          'Design for security and compliance',
          'Design for reliability and fidelity',
          'Design for flexibility and portability',
          'Design data migration strategies',
        ],
      },
      {
        name: 'Ingest and Process the Data',
        weight: 25,
        tasks: [
          'Plan the data pipelines',
          'Build the pipelines',
          'Deploy the pipelines',
          'Design streaming and batch ingestion architectures',
          'Implement data quality checks and schema evolution controls',
        ],
      },
      {
        name: 'Store the Data',
        weight: 20,
        tasks: [
          'Select storage systems',
          'Plan for using a data warehouse',
          'Plan for using a data lake',
          'Design for a data mesh',
          'Design partitioning, clustering, and lifecycle management strategies',
          'Plan backup, retention, and disaster recovery for data platforms',
        ],
      },
      {
        name: 'Prepare and Use Data for Analysis',
        weight: 15,
        tasks: [
          'Prepare data for visualization',
          'Share data with stakeholders',
          'Explore and analyze data',
        ],
      },
      {
        name: 'Maintain and Automate Data Workloads',
        weight: 18,
        tasks: [
          'Optimize resources',
          'Design automation and repeatability',
          'Organize workloads based on business requirements',
          'Monitor and troubleshoot processes',
          'Maintain awareness of failures and mitigate impact',
        ],
      },
    ],
  },
  {
    id: 'gcp-pcse',
    name: 'Google Cloud Professional Cloud Security Engineer',
    code: 'PCSE',
    provider: 'Google Cloud',
    level: 'Professional',
    domains: [
      {
        name: 'Configuring Access',
        weight: 26,
        tasks: [
          'Manage Cloud Identity',
          'Manage service accounts',
          'Manage authentication',
          'Manage and implement authorization controls',
          'Define resource hierarchy',
        ],
      },
      {
        name: 'Managing Operations',
        weight: 22,
        tasks: [
          'Build and deploy secure infrastructure and applications',
          'Configure logging, monitoring, and detection',
        ],
      },
      {
        name: 'Configuring Network Security',
        weight: 20,
        tasks: [
          'Design and configure network perimeter security',
          'Configure Network Security for internal and service-to-service traffic',
          'Implement segmentation and east-west traffic controls',
          'Design private access patterns for managed services',
        ],
      },
      {
        name: 'Ensuring Data Protection',
        weight: 20,
        tasks: [
          'Protect sensitive data and prevent data loss',
          'Manage encryption at rest, in transit, and in use',
        ],
      },
      {
        name: 'Ensuring Compliance',
        weight: 12,
        tasks: [
          'Determine regulatory requirements for the cloud',
          'Determine security controls within Google Cloud',
          'Map controls to audit evidence and continuous compliance reporting',
          'Integrate policy monitoring into security operations workflows',
        ],
      },
    ],
  },
];
