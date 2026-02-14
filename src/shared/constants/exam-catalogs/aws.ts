import type { CertEntry } from './types';

export const AWS_CERTS: CertEntry[] = [
  {
    id: 'clf-c02',
    name: 'AWS Certified Cloud Practitioner',
    code: 'CLF-C02',
    provider: 'AWS',
    level: 'Foundational',
    domains: [
      {
        name: 'Cloud Concepts',
        weight: 24,
        tasks: [
          'Define the benefits of the AWS Cloud',
          'Identify design principles of the AWS Cloud',
          'Understand the benefits of and strategies for migration to the AWS Cloud',
          'Understand concepts of cloud economics',
        ],
      },
      {
        name: 'Security and Compliance',
        weight: 30,
        tasks: [
          'Understand the AWS shared responsibility model',
          'Understand AWS Cloud security, governance, and compliance concepts',
          'Identify AWS access management capabilities',
          'Identify components and resources for security',
        ],
      },
      {
        name: 'Cloud Technology and Services',
        weight: 34,
        tasks: [
          'Define methods of deploying and operating in the AWS Cloud',
          'Define the AWS global infrastructure',
          'Identify AWS compute services',
          'Identify AWS database services',
          'Identify AWS network services',
          'Identify AWS storage services',
          'Identify AWS AI/ML services and analytics services',
          'Identify services from other in-scope AWS service categories',
        ],
      },
      {
        name: 'Billing, Pricing, and Support',
        weight: 12,
        tasks: [
          'Compare AWS pricing models',
          'Understand resources for billing, budget, and cost management',
          'Identify AWS technical resources and AWS Support options',
        ],
      },
    ],
  },
  {
    id: 'aif-c01',
    name: 'AWS Certified AI Practitioner',
    code: 'AIF-C01',
    provider: 'AWS',
    level: 'Foundational',
    domains: [
      {
        name: 'Fundamentals of AI and ML',
        weight: 20,
        tasks: [
          'Explain basic AI concepts and terminologies',
          'Identify practical use cases for AI',
          'Describe the ML development lifecycle',
          'Distinguish predictive AI from generative AI scenarios',
          'Identify criteria for selecting AWS AI and ML services',
        ],
      },
      {
        name: 'Fundamentals of Generative AI',
        weight: 24,
        tasks: [
          'Explain the basic concepts of generative AI',
          'Understand the capabilities and limitations of generative AI for solving business problems',
          'Describe AWS generative AI services',
          'Describe prompt design fundamentals and grounding strategies',
          'Identify quality and safety risks in generative AI outputs',
        ],
      },
      {
        name: 'Applications of Foundation Models',
        weight: 28,
        tasks: [
          'Describe design considerations for foundation model applications',
          'Choose effective prompt engineering techniques',
          'Describe the training and fine-tuning process for foundation models',
          'Describe methods to evaluate foundation model performance',
        ],
      },
      {
        name: 'Guidelines for Responsible AI',
        weight: 14,
        tasks: [
          'Explain the development of AI systems that are responsible',
          'Recognize the importance of transparent and explainable models',
          'Identify bias, fairness, and accountability controls for AI systems',
        ],
      },
      {
        name: 'Security, Compliance, and Governance for AI Solutions',
        weight: 14,
        tasks: [
          'Explain methods to secure AI systems',
          'Recognize governance and compliance regulations for AI systems',
          'Describe data protection and model access control patterns for AI workloads',
        ],
      },
    ],
  },
  {
    id: 'dva-c02',
    name: 'AWS Certified Developer - Associate',
    code: 'DVA-C02',
    provider: 'AWS',
    level: 'Associate',
    domains: [
      {
        name: 'Development with AWS Services',
        weight: 32,
        tasks: [
          'Develop code for applications hosted on AWS',
          'Develop code for AWS Lambda',
          'Use data stores in application development',
          'Integrate asynchronous messaging and event-driven workflows',
          'Implement resilience patterns for distributed applications',
        ],
      },
      {
        name: 'Security',
        weight: 26,
        tasks: [
          'Implement authentication and/or authorization for applications and AWS services',
          'Implement encryption by using AWS services',
          'Manage sensitive data in application code',
          'Implement secure secret retrieval and rotation strategies',
        ],
      },
      {
        name: 'Deployment',
        weight: 24,
        tasks: [
          'Prepare application artifacts to be deployed to AWS',
          'Test applications in development environments',
          'Automate deployment testing',
          'Deploy code by using AWS CI/CD services',
        ],
      },
      {
        name: 'Troubleshooting and Optimization',
        weight: 18,
        tasks: [
          'Assist in a root cause analysis',
          'Instrument code for observability',
          'Optimize applications by using AWS services and features',
          'Analyze performance bottlenecks and tune runtime behavior',
        ],
      },
    ],
  },
  {
    id: 'soa-c03',
    name: 'AWS Certified CloudOps Engineer - Associate',
    code: 'SOA-C03',
    provider: 'AWS',
    level: 'Associate',
    domains: [
      {
        name: 'Monitoring, Logging, Analysis, Remediation, and Performance Optimization',
        weight: 20,
        tasks: [
          'Implement metrics, alarms, and filters by using AWS monitoring and logging services',
          'Remediate issues based on monitoring and availability metrics',
          'Optimize performance and cost based on metrics and data',
        ],
      },
      {
        name: 'Reliability and Business Continuity',
        weight: 16,
        tasks: [
          'Implement scalability and elasticity based on use case',
          'Implement high availability and resilient environments',
          'Implement backup and restore strategies',
          'Validate disaster recovery readiness through recovery testing',
        ],
      },
      {
        name: 'Deployment, Provisioning, and Automation',
        weight: 18,
        tasks: [
          'Provision and maintain cloud resources',
          'Automate manual or repeatable processes',
          'Implement policy-driven infrastructure provisioning controls',
        ],
      },
      {
        name: 'Security and Compliance',
        weight: 16,
        tasks: [
          'Implement and manage security and compliance policies',
          'Implement data and infrastructure protection strategies',
          'Operate continuous compliance monitoring and reporting workflows',
        ],
      },
      {
        name: 'Networking and Content Delivery',
        weight: 18,
        tasks: [
          'Implement networking features and connectivity',
          'Configure domains, DNS services, and content delivery',
          'Troubleshoot network connectivity issues',
        ],
      },
    ],
  },
  {
    id: 'saa-c03',
    name: 'AWS Certified Solutions Architect - Associate',
    code: 'SAA-C03',
    provider: 'AWS',
    level: 'Associate',
    domains: [
      {
        name: 'Design Secure Architectures',
        weight: 30,
        tasks: [
          'Design secure access to AWS resources',
          'Design secure workloads and applications',
          'Determine appropriate data security controls',
        ],
      },
      {
        name: 'Design Resilient Architectures',
        weight: 26,
        tasks: [
          'Design scalable and loosely coupled architectures',
          'Design highly available and/or fault-tolerant architectures',
        ],
      },
      {
        name: 'Design High-Performing Architectures',
        weight: 24,
        tasks: [
          'Determine high-performing and/or scalable storage solutions',
          'Design high-performing and elastic compute solutions',
          'Determine high-performing database solutions',
          'Determine high-performing and/or scalable network architectures',
          'Determine high-performing data ingestion and transformation solutions',
        ],
      },
      {
        name: 'Design Cost-Optimized Architectures',
        weight: 20,
        tasks: [
          'Design cost-optimized storage solutions',
          'Design cost-optimized compute solutions',
          'Design cost-optimized database solutions',
          'Design cost-optimized network architectures',
        ],
      },
    ],
  },
  {
    id: 'mla-c01',
    name: 'AWS Certified Machine Learning Engineer - Associate',
    code: 'MLA-C01',
    provider: 'AWS',
    level: 'Associate',
    domains: [
      {
        name: 'Data Preparation for Machine Learning',
        weight: 28,
        tasks: [
          'Ingest and store data',
          'Transform data and perform feature engineering',
          'Ensure data integrity and prepare data for ML',
          'Implement data quality validation for training and inference datasets',
        ],
      },
      {
        name: 'ML Model Development',
        weight: 26,
        tasks: [
          'Choose a modeling approach',
          'Train and refine models',
          'Analyze and evaluate models',
          'Select metrics aligned to business and model risk requirements',
        ],
      },
      {
        name: 'Deployment and Orchestration of ML Workflows',
        weight: 22,
        tasks: [
          'Select deployment infrastructure based on existing architecture and requirements',
          'Create and script infrastructure based on existing architecture and requirements',
          'Use automated orchestration tools to set up continuous integration and continuous delivery (CI/CD) pipelines',
        ],
      },
      {
        name: 'ML Solution Monitoring, Maintenance, and Security',
        weight: 24,
        tasks: [
          'Monitor model performance and data quality',
          'Recommend improvements to ML solution performance',
          'Implement security practices for ML solutions',
          'Detect drift and trigger remediation workflows for model reliability',
        ],
      },
    ],
  },
  {
    id: 'dea-c01',
    name: 'AWS Certified Data Engineer - Associate',
    code: 'DEA-C01',
    provider: 'AWS',
    level: 'Associate',
    domains: [
      {
        name: 'Data Ingestion and Transformation',
        weight: 34,
        tasks: [
          'Perform data ingestion',
          'Transform and process data',
          'Orchestrate data pipelines',
          'Determine data layout, schema, structure, and format',
        ],
      },
      {
        name: 'Data Store Management',
        weight: 26,
        tasks: [
          'Choose a data store',
          'Understand data cataloging systems',
          'Manage the lifecycle of data',
        ],
      },
      {
        name: 'Data Operations and Support',
        weight: 22,
        tasks: [
          'Automate data processing by using AWS services',
          'Analyze data by using AWS services',
          'Maintain and monitor data pipelines',
          'Ensure data quality',
        ],
      },
      {
        name: 'Data Security and Governance',
        weight: 18,
        tasks: [
          'Apply authentication mechanisms',
          'Apply authorization mechanisms',
          'Ensure data encryption and masking',
          'Prepare logs for audit',
          'Understand data privacy and governance',
        ],
      },
    ],
  },
  {
    id: 'aip-c01',
    name: 'AWS Certified Generative AI Developer - Professional',
    code: 'AIP-C01',
    provider: 'AWS',
    level: 'Professional',
    domains: [
      {
        name: 'Foundation Model Integration, Data Management, and Compliance',
        weight: 24,
        tasks: [
          'Select and configure foundation models for specific use cases',
          'Determine data requirements for foundation model customization',
          'Apply compliance and governance standards to generative AI applications',
        ],
      },
      {
        name: 'Implementation and Integration',
        weight: 28,
        tasks: [
          'Develop applications using Amazon Bedrock and other generative AI services',
          'Implement retrieval augmented generation (RAG) solutions',
          'Develop agentic solutions using foundation models',
        ],
      },
      {
        name: 'AI Safety, Security, and Governance',
        weight: 16,
        tasks: [
          'Implement guardrails for generative AI applications',
          'Apply security best practices to generative AI solutions',
          'Implement governance frameworks for AI systems',
        ],
      },
      {
        name: 'Operational Efficiency and Optimization for GenAI Applications',
        weight: 18,
        tasks: [
          'Optimize foundation model inference performance',
          'Implement cost optimization strategies for generative AI workloads',
          'Monitor and troubleshoot generative AI applications',
        ],
      },
      {
        name: 'Testing, Validation, and Troubleshooting',
        weight: 14,
        tasks: [
          'Design and implement testing strategies for generative AI applications',
          'Validate model outputs and application behavior',
          'Troubleshoot generative AI application issues',
        ],
      },
    ],
  },
  {
    id: 'sap-c02',
    name: 'AWS Certified Solutions Architect - Professional',
    code: 'SAP-C02',
    provider: 'AWS',
    level: 'Professional',
    domains: [
      {
        name: 'Design Solutions for Organizational Complexity',
        weight: 26,
        tasks: [
          'Architect network connectivity strategies',
          'Prescribe security controls',
          'Design reliable and resilient architectures',
          'Design a multi-account AWS environment',
          'Determine cost optimization and visibility strategies',
        ],
      },
      {
        name: 'Design for New Solutions',
        weight: 29,
        tasks: [
          'Design a deployment strategy to meet business requirements',
          'Design a solution to ensure business continuity',
          'Determine security controls based on requirements',
          'Design a strategy to meet reliability requirements',
          'Design a solution to meet performance objectives',
          'Determine a cost optimization strategy to meet solution goals and objectives',
        ],
      },
      {
        name: 'Continuous Improvement for Existing Solutions',
        weight: 25,
        tasks: [
          'Determine a strategy to improve overall operational excellence',
          'Determine a strategy to improve security',
          'Determine a strategy to improve performance',
          'Determine a strategy to improve reliability',
          'Identify opportunities for cost optimizations',
        ],
      },
      {
        name: 'Accelerate Workload Migration and Modernization',
        weight: 20,
        tasks: [
          'Select existing workloads and processes for potential migration',
          'Determine the optimal migration approach for existing workloads',
          'Determine a new architecture design for existing workloads',
          'Determine opportunities for modernization and enhancements',
        ],
      },
    ],
  },
  {
    id: 'dop-c02',
    name: 'AWS Certified DevOps Engineer - Professional',
    code: 'DOP-C02',
    provider: 'AWS',
    level: 'Professional',
    domains: [
      {
        name: 'SDLC Automation',
        weight: 22,
        tasks: [
          'Implement CI/CD pipelines',
          'Integrate automated testing into CI/CD pipelines',
          'Build and manage artifacts',
          'Implement deployment strategies',
        ],
      },
      {
        name: 'Configuration Management and IaC',
        weight: 17,
        tasks: [
          'Define cloud infrastructure and reusable components to provision and manage systems throughout their lifecycle',
          'Deploy automation to create, update, and delete infrastructure',
          'Implement service and infrastructure configuration management',
        ],
      },
      {
        name: 'Resilient Cloud Solutions',
        weight: 15,
        tasks: [
          'Implement highly available solutions',
          'Implement solutions that are scalable to accommodate changing workloads',
          'Implement automated recovery processes',
        ],
      },
      {
        name: 'Monitoring and Logging',
        weight: 15,
        tasks: [
          'Configure the collection, aggregation, and storage of logs and metrics',
          'Audit, monitor, and analyze logs and metrics to detect issues',
          'Automate monitoring and event management of complex environments',
        ],
      },
      {
        name: 'Incident and Event Response',
        weight: 14,
        tasks: [
          'Manage event sources to process, notify, and take action in response to events',
          'Implement configuration changes in response to events',
          'Troubleshoot issues and determine remediation steps',
        ],
      },
      {
        name: 'Security and Compliance',
        weight: 17,
        tasks: [
          'Implement techniques for identity and access management at scale',
          'Apply automated security controls to manage sensitive data and credentials',
          'Implement compliance validation and audit strategies',
        ],
      },
    ],
  },
  {
    id: 'mls-c01',
    name: 'AWS Certified Machine Learning - Specialty',
    code: 'MLS-C01',
    provider: 'AWS',
    level: 'Specialty',
    domains: [
      {
        name: 'Data Engineering',
        weight: 20,
        tasks: [
          'Create data repositories for ML',
          'Identify and implement a data ingestion solution',
          'Identify and implement a data transformation solution',
        ],
      },
      {
        name: 'Exploratory Data Analysis',
        weight: 24,
        tasks: [
          'Sanitize and prepare data for modeling',
          'Perform feature engineering',
          'Analyze and visualize data for ML',
        ],
      },
      {
        name: 'Modeling',
        weight: 36,
        tasks: [
          'Frame business problems as ML problems',
          'Select the appropriate model(s) for a given ML problem',
          'Train ML models',
          'Perform hyperparameter optimization',
          'Evaluate ML models',
        ],
      },
      {
        name: 'Machine Learning Implementation and Operations',
        weight: 20,
        tasks: [
          'Build ML solutions for performance, availability, scalability, resiliency, and fault tolerance',
          'Recommend and implement the appropriate ML services and features for a given problem',
          'Apply basic AWS security practices to ML solutions',
          'Deploy and operationalize ML solutions',
        ],
      },
    ],
  },
  {
    id: 'scs-c03',
    name: 'AWS Certified Security - Specialty',
    code: 'SCS-C03',
    provider: 'AWS',
    level: 'Specialty',
    domains: [
      {
        name: 'Detection',
        weight: 16,
        tasks: [
          'Design and implement monitoring and alerting for an AWS account or organization',
          'Design and implement logging',
          'Troubleshoot security monitoring, logging and alerting',
        ],
      },
      {
        name: 'Incident Response',
        weight: 14,
        tasks: [
          'Design and test an incident response plan',
          'Respond to security events',
          'Perform containment, eradication, and recovery actions in cloud incidents',
        ],
      },
      {
        name: 'Infrastructure Security',
        weight: 18,
        tasks: [
          'Design, implement, and troubleshoot security controls for network edge services',
          'Design, implement, and troubleshoot security controls for compute workloads',
          'Design and troubleshoot network security controls',
        ],
      },
      {
        name: 'Identity and Access Management',
        weight: 20,
        tasks: [
          'Design, implement, and troubleshoot authentication strategies',
          'Design, implement, and troubleshoot authorization strategies',
          'Implement privileged access controls and federation patterns',
        ],
      },
      {
        name: 'Data Protection',
        weight: 18,
        tasks: [
          'Design and implement controls for data in transit',
          'Design and implement controls for data at rest',
          'Design and implement controls to protect confidential data, credentials, secrets, and cryptographic key materials',
        ],
      },
      {
        name: 'Security Foundations and Governance',
        weight: 14,
        tasks: [
          'Develop a strategy to centrally deploy and manage AWS accounts',
          'Implement a secure and consistent deployment strategy for cloud resources',
          'Evaluate the compliance of AWS resources',
        ],
      },
    ],
  },
  {
    id: 'ans-c01',
    name: 'AWS Certified Advanced Networking - Specialty',
    code: 'ANS-C01',
    provider: 'AWS',
    level: 'Specialty',
    domains: [
      {
        name: 'Network Design',
        weight: 30,
        tasks: [
          'Design a solution that incorporates edge network services to optimize user performance and traffic management for global architectures',
          'Design DNS solutions that meet public, private, and hybrid requirements',
          'Design solutions that integrate load balancing to meet high availability, scalability, and security requirements',
          'Define logging and monitoring requirements across AWS and hybrid networks',
          'Design a routing strategy and connectivity architecture between on-premises networks and the AWS Cloud',
          'Design a routing strategy and connectivity architecture that include multiple AWS accounts, AWS Regions, and VPCs to support different connectivity patterns',
        ],
      },
      {
        name: 'Network Implementation',
        weight: 26,
        tasks: [
          'Implement routing and connectivity between on-premises networks and the AWS Cloud',
          'Implement routing and connectivity across multiple AWS accounts, Regions, and VPCs to support different connectivity patterns',
          'Implement complex hybrid and multi-account DNS architectures',
          'Automate and configure network infrastructure',
        ],
      },
      {
        name: 'Network Management and Operation',
        weight: 20,
        tasks: [
          'Maintain routing and connectivity on AWS and hybrid networks',
          'Monitor and analyze network traffic to troubleshoot and optimize connectivity patterns',
          'Optimize AWS networks for performance, reliability, and cost-effectiveness',
        ],
      },
      {
        name: 'Network Security, Compliance, and Governance',
        weight: 24,
        tasks: [
          'Implement and maintain network features to meet security and compliance needs and requirements',
          'Validate and audit security by using network monitoring and logging services',
          'Implement and maintain confidentiality of data and communications of the network',
        ],
      },
    ],
  },
];
