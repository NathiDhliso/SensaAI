# Application Architecture & Microsoft Learning Science Nodes

> [!NOTE]
> This document provides a comprehensive mapping of all UI pages, components, and the exact Microsoft Learning Science nodes utilized within the application.

## 1. Pages
The following pages were identified in `src/pages`:

- `src/pages/AuthCallback.tsx`
- `src/pages/CommunityLibrary.tsx`
- `src/pages/ConfirmSignUp.tsx`
- `src/pages/ContentGenerator.tsx`
- `src/pages/DevSandbox.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/GymLaunchpad.tsx`
- `src/pages/Home.tsx`
- `src/pages/Login.tsx`
- `src/pages/MasteryDashboard.tsx`
- `src/pages/NotFound.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/SignUp.tsx`
- `src/pages/UnifiedStudyRoom.tsx`

## 2. Components
The following components and internal modules were identified in `src/components`:

- `src/components/auth/index.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/dashboard/BlueprintFormulaDashboard.tsx`
- `src/components/dashboard/MasteryDashboard.tsx`
- `src/components/error/AppErrorBoundary.tsx`
- `src/components/error/LearningErrorBoundary.tsx`
- `src/components/generation/AgentCore.tsx`
- `src/components/generation/CognitiveStream.tsx`
- `src/components/layout/index.ts`
- `src/components/layout/StudyLayout.tsx`
- `src/components/learning/ActiveLearningEngine.tsx`
- `src/components/learning/activities/ConceptMapBuilder.tsx`
- `src/components/learning/activities/index.ts`
- `src/components/learning/activities/PeerReviewActivity.tsx`
- `src/components/learning/activities/PreMortemActivity.tsx`
- `src/components/learning/cognitive-matrix/buildMatrixPayload.ts`
- `src/components/learning/cognitive-matrix/CognitiveMatrixGrid.tsx`
- `src/components/learning/cognitive-matrix/CognitiveMatrixGridParts.tsx`
- `src/components/learning/cognitive-matrix/DrillDownCard.tsx`
- `src/components/learning/cognitive-matrix/types.ts`
- `src/components/learning/discovery/DeepStructureDetails.tsx`
- `src/components/learning/discovery/DeepStructureDiscovery.tsx`
- `src/components/learning/feedback/CelebrationModal.tsx`
- `src/components/learning/feedback/ConnectionTypeModal.tsx`
- `src/components/learning/feedback/index.ts`
- `src/components/learning/feedback/NeuralResetModal.tsx`
- `src/components/learning/gym/GymActivityLauncher.tsx`
- `src/components/learning/index.ts`
- `src/components/learning/launchpad/KnowledgeHealthPanel.tsx`
- `src/components/learning/launchpad/ScoreCard.tsx`
- `src/components/learning/launchpad/TierDistributionChart.tsx`
- `src/components/learning/MicroLearningLoopController.tsx`
- `src/components/learning/session/index.ts`
- `src/components/learning/session/SessionSummary.tsx`
- `src/components/learning/ui/CognitiveGauge.tsx`
- `src/components/learning/ui/index.ts`
- `src/components/learning/ULCPracticeController.tsx`
- `src/components/settings/index.ts`
- `src/components/settings/SettingsPanel.tsx`
- `src/components/storage/CloudLibraryModal.tsx`
- `src/components/ui/BackgroundJobToast.tsx`
- `src/components/ui/ConceptProgressIndicator.tsx`
- `src/components/ui/EquationTracker.tsx`
- `src/components/ui/FlowProgressBar.tsx`
- `src/components/ui/HelpModal.tsx`
- `src/components/ui/index.ts`
- `src/components/ui/MomentumCheckpoint.tsx`
- `src/components/ui/SensaAnimLogo.tsx`
- `src/components/ui/SensaShape.tsx`
- `src/components/ui/SensaShape.types.ts`
- `src/components/ui/SensaShape.utils.tsx`
- `src/components/ui/SessionTimeToast.tsx`

## 3. Microsoft Learning Science Nodes
The following nodes (Domains and Tasks) represent the exact learning criteria parsed directly from the internal SensaPBL Microsoft exam catalog.

### Microsoft Azure Fundamentals (AZ-900)
**Level:** Foundational | **Provider:** Microsoft

#### Describe Cloud Concepts (Weight: 25%)
- Define cloud computing
- Describe the shared responsibility model
- Define cloud models, including public, private, and hybrid
- Identify appropriate use cases for each cloud model
- Describe the consumption-based model
- Compare cloud pricing models
- Describe serverless
- Describe the benefits of high availability and scalability in the cloud
- Describe the benefits of reliability and predictability in the cloud
- Describe the benefits of security and governance in the cloud
- Describe the benefits of manageability in the cloud
- Describe infrastructure as a service (IaaS)
- Describe platform as a service (PaaS)
- Describe software as a service (SaaS)
- Identify appropriate use cases for each cloud service type (IaaS, PaaS, and SaaS)

#### Describe Azure Architecture and Services (Weight: 35%)
- Describe Azure regions, region pairs, and sovereign regions
- Describe availability zones
- Describe Azure datacenters
- Describe Azure resources and resource groups
- Describe subscriptions
- Describe management groups
- Describe the hierarchy of resource groups, subscriptions, and management groups
- Compare compute types, including containers, virtual machines, and functions
- Describe virtual machine options, including Azure virtual machines, Azure Virtual Machine Scale Sets, availability sets, and Azure Virtual Desktop
- Describe the resources required for virtual machines
- Describe application hosting options, including web apps, containers, and virtual machines
- Describe virtual networking, including the purpose of Azure virtual networks, Azure virtual subnets, peering, Azure DNS, Azure VPN Gateway, and ExpressRoute
- Define public and private endpoints
- Compare Azure Storage services
- Describe storage tiers
- Describe redundancy options
- Describe storage account options and storage types
- Identify options for moving files, including AzCopy, Azure Storage Explorer, and Azure File Sync
- Describe migration options, including Azure Migrate and Azure Data Box
- Describe directory services in Azure, including Microsoft Entra ID and Microsoft Entra Domain Services
- Describe authentication methods in Azure, including single sign-on (SSO), multifactor authentication (MFA), and passwordless
- Describe external identities in Azure
- Describe Microsoft Entra Conditional Access
- Describe Azure role-based access control (RBAC)
- Describe the concept of Zero Trust
- Describe the purpose of the defense-in-depth model
- Describe the purpose of Microsoft Defender for Cloud

#### Describe Azure Management and Governance (Weight: 30%)
- Describe factors that can affect costs in Azure
- Explore the pricing calculator
- Describe cost management capabilities in Azure
- Describe the purpose of tags
- Describe the purpose of Microsoft Purview in Azure
- Describe the purpose of Azure Policy
- Describe the purpose of resource locks
- Describe the Azure portal
- Describe Azure Cloud Shell, including Azure Command-Line Interface (CLI) and Azure PowerShell
- Describe the purpose of Azure Arc
- Describe infrastructure as code (IaC)
- Describe Azure Resource Manager (ARM) and ARM templates
- Describe the purpose of Azure Advisor
- Describe Azure Service Health
- Describe Azure Monitor, including Log Analytics, Azure Monitor alerts, and Application Insights

---

### Microsoft Azure AI Fundamentals (AI-900)
**Level:** Foundational | **Provider:** Microsoft

#### Describe Artificial Intelligence Workloads and Considerations (Weight: 15%)
- Identify computer vision workloads
- Identify natural language processing workloads
- Identify document processing workloads
- Identify features of generative AI workloads
- Describe considerations for fairness in an AI solution
- Describe considerations for reliability and safety in an AI solution
- Describe considerations for privacy and security in an AI solution
- Describe considerations for inclusiveness in an AI solution
- Describe considerations for transparency in an AI solution
- Describe considerations for accountability in an AI solution

#### Describe Fundamental Principles of Machine Learning on Azure (Weight: 15%)
- Identify regression machine learning scenarios
- Identify classification machine learning scenarios
- Identify clustering machine learning scenarios
- Identify features of deep learning techniques
- Identify features of the Transformer architecture
- Identify features and labels in a dataset for machine learning
- Describe how training and validation datasets are used in machine learning
- Describe capabilities of automated machine learning
- Describe data and compute services for data science and machine learning
- Describe model management and deployment capabilities in Azure Machine Learning

#### Describe Features of Computer Vision Workloads on Azure (Weight: 15%)
- Identify features of image classification solutions
- Identify features of object detection solutions
- Identify features of optical character recognition solutions
- Identify features of facial detection and facial analysis solutions
- Describe capabilities of the Azure AI Vision service
- Describe capabilities of the Azure AI Face detection service

#### Describe Features of Natural Language Processing Workloads on Azure (Weight: 15%)
- Identify features and uses for key phrase extraction
- Identify features and uses for entity recognition
- Identify features and uses for sentiment analysis
- Identify features and uses for language modeling
- Identify features and uses for speech recognition and synthesis
- Identify features and uses for translation
- Describe capabilities of the Azure AI Language service
- Describe capabilities of the Azure AI Speech service

#### Describe Features of Generative AI Workloads on Azure (Weight: 20%)
- Identify features of generative AI models
- Identify common scenarios for generative AI
- Identify responsible AI considerations for generative AI
- Describe features and capabilities of Azure AI Foundry
- Describe features and capabilities of Azure OpenAI service
- Describe features and capabilities of Azure AI Foundry model catalog

---

### Microsoft Azure Data Fundamentals (DP-900)
**Level:** Foundational | **Provider:** Microsoft

#### Describe Core Data Concepts (Weight: 25%)
- Describe features of structured data
- Describe features of semi-structured data
- Describe features of unstructured data
- Describe common formats for data files
- Describe types of databases
- Describe features of transactional workloads
- Describe features of analytical workloads
- Describe responsibilities for database administrators
- Describe responsibilities for data engineers
- Describe responsibilities for data analysts

#### Identify Considerations for Relational Data on Azure (Weight: 20%)
- Identify features of relational data
- Describe normalization and why it is used
- Identify common structured query language (SQL) statements
- Identify common database objects
- Describe the Azure SQL family of products including Azure SQL Database, Azure SQL Managed Instance, and SQL Server on Azure Virtual Machines
- Identify Azure database services for open-source database systems

#### Describe Considerations for Working with Non-Relational Data on Azure (Weight: 15%)
- Describe Azure Blob storage
- Describe Azure File storage
- Describe Azure Table storage
- Identify use cases for Azure Cosmos DB
- Describe Azure Cosmos DB APIs

#### Describe an Analytics Workload on Azure (Weight: 25%)
- Describe considerations for data ingestion and processing
- Describe options for analytical data stores
- Describe Microsoft cloud services for large-scale analytics, including Azure Databricks and Microsoft Fabric
- Describe the difference between batch and streaming data
- Identify Microsoft cloud services for real-time analytics
- Identify capabilities of Power BI
- Describe features of data models in Power BI
- Identify ropriate visualizations for data

---

### Microsoft Security, Compliance, and Identity Fundamentals (SC-900)
**Level:** Foundational | **Provider:** Microsoft

#### Describe the Concepts of Security, Compliance, and Identity (Weight: 10%)
- Describe the shared responsibility model
- Describe defense-in-depth
- Describe the Zero Trust model
- Describe encryption and hashing
- Describe Governance, Risk, and Compliance (GRC) concepts
- Define identity as the primary security perimeter
- Define authentication
- Define authorization
- Describe identity providers
- Describe the concept of directory services and Active Directory
- Describe the concept of federation

#### Describe the Capabilities of Microsoft Entra (Weight: 25%)
- Describe Microsoft Entra ID
- Describe types of identities
- Describe hybrid identity
- Describe the authentication methods
- Describe multifactor authentication (MFA)
- Describe password protection and management capabilities
- Describe Conditional Access
- Describe Microsoft Entra roles and role-based access control (RBAC)
- Describe Microsoft Entra ID Governance
- Describe access reviews
- Describe the capabilities of Microsoft Entra Privileged Identity Management
- Describe Microsoft Entra ID Protection

#### Describe the Capabilities of Microsoft Security Solutions (Weight: 35%)
- Describe Azure distributed denial-of-service (DDoS) Protection
- Describe Azure Firewall
- Describe Web Application Firewall (WAF)
- Describe network segmentation with Azure virtual networks
- Describe network security groups (NSGs)
- Describe Azure Bastion
- Describe Azure Key Vault
- Describe Microsoft Defender for Cloud
- Describe Cloud Security Posture Management (CSPM)
- Describe how security policies, standards, and recommendations improve the cloud security posture
- Describe enhanced security features provided by cloud workload protection
- Define the concepts of security information and event management (SIEM) and security orchestration automated response (SOAR)
- Describe threat detection and mitigation capabilities in Microsoft Sentinel
- Describe Microsoft Defender XDR services
- Describe Microsoft Defender for Office 365
- Describe Microsoft Defender for Endpoint
- Describe Microsoft Defender for Cloud Apps
- Describe Microsoft Defender for Identity
- Describe Microsoft Defender Vulnerability Management
- Describe Microsoft Defender Threat Intelligence (Defender TI)
- Describe the Microsoft Defender portal

#### Describe the Capabilities of Microsoft Compliance Solutions (Weight: 20%)
- Describe the Service Trust Portal offerings
- Describe the privacy principles of Microsoft
- Describe Microsoft Priva
- Describe the Microsoft Purview portal
- Describe Compliance Manager
- Describe the uses and benefits of compliance score
- Describe the data classification capabilities
- Describe the benefits of Content explorer and Activity explorer
- Describe sensitivity labels and sensitivity label policies
- Describe data loss prevention (DLP)
- Describe records management
- Describe retention policies, retention labels, and retention label policies
- Describe insider risk management
- Describe eDiscovery solutions in Microsoft Purview
- Describe audit solutions in Microsoft Purview

---

### Microsoft Azure Administrator (AZ-104)
**Level:** Associate | **Provider:** Microsoft

#### Manage Azure Identities and Governance (Weight: 20%)
- Create users and groups in Microsoft Entra ID
- Manage user and group properties
- Manage licenses in Microsoft Entra ID
- Manage external users
- Configure self-service password reset (SSPR)
- Manage built-in Azure roles
- Assign roles at different scopes
- Interpret access assignments
- Implement and manage Azure Policy
- Configure resource locks
- Apply and manage tags on resources
- Manage resource groups
- Manage subscriptions
- Manage costs by using alerts, budgets, and Azure Advisor recommendations
- Configure management groups

#### Implement and Manage Storage (Weight: 15%)
- Configure Azure Storage firewalls and virtual networks
- Create and use shared access signature (SAS) tokens
- Configure stored access policies
- Manage access keys
- Configure identity-based access for Azure Files
- Create and configure storage accounts
- Configure Azure Storage redundancy
- Configure object replication
- Configure storage account encryption
- Manage data by using Azure Storage Explorer and AzCopy
- Create and configure a file share in Azure Storage
- Create and configure a container in Blob Storage
- Configure storage tiers
- Configure soft delete for blobs and containers
- Configure snapshots and soft delete for Azure Files
- Configure blob lifecycle management
- Configure blob versioning

#### Deploy and Manage Azure Compute Resources (Weight: 20%)
- Interpret an Azure Resource Manager template or a Bicep file
- Modify an existing Azure Resource Manager template
- Modify an existing Bicep file
- Deploy resources by using an Azure Resource Manager template or a Bicep file
- Export a deployment as an Azure Resource Manager template or convert to a Bicep file
- Create a virtual machine
- Configure Azure Disk Encryption
- Move a virtual machine to another resource group, subscription, or region
- Manage virtual machine sizes
- Manage virtual machine disks
- Deploy virtual machines to availability zones and availability sets
- Deploy and configure Azure Virtual Machine Scale Sets
- Create and manage an Azure container registry
- Provision a container by using Azure Container Instances
- Provision a container by using Azure Container Apps
- Manage sizing and scaling for containers, including Azure Container Instances and Azure Container Apps
- Provision an App Service plan
- Configure scaling for an App Service plan
- Create an App Service
- Configure certificates and Transport Layer Security (TLS) for an App Service
- Map an existing custom DNS name to an App Service
- Configure backup for an App Service
- Configure networking settings for an App Service
- Configure deployment slots for an App Service

#### Implement and Manage Virtual Networking (Weight: 15%)
- Create and configure virtual networks and subnets
- Create and configure virtual network peering
- Configure public IP addresses
- Configure user-defined network routes
- Troubleshoot network connectivity
- Create and configure network security groups (NSGs) and application security groups
- Evaluate effective security rules in NSGs
- Implement Azure Bastion
- Configure service endpoints for Azure platform as a service (PaaS)
- Configure private endpoints for Azure PaaS
- Configure Azure DNS
- Configure an internal or public load balancer
- Troubleshoot load balancing

#### Monitor and Maintain Azure Resources (Weight: 10%)
- Interpret metrics in Azure Monitor
- Configure log settings in Azure Monitor
- Query and analyze logs in Azure Monitor
- Set up alert rules, action groups, and alert processing rules in Azure Monitor
- Configure and interpret monitoring of virtual machines, storage accounts, and networks by using Azure Monitor Insights
- Use Azure Network Watcher and Connection Monitor
- Create a Recovery Services vault
- Create an Azure Backup vault
- Create and configure a backup policy
- Perform backup and restore operations by using Azure Backup
- Configure Azure Site Recovery for Azure resources
- Perform a failover to a secondary region by using Site Recovery
- Configure and interpret reports and alerts for backups

---

### Microsoft Power BI Data Analyst (PL-300)
**Level:** Associate | **Provider:** Microsoft

#### Prepare the Data (Weight: 25%)
- Identify and connect to data sources or a shared semantic model
- Change data source settings, including credentials and privacy levels
- Choose between DirectQuery and Import
- Create and modify parameters
- Evaluate data, including data statistics and column properties
- Resolve inconsistencies, unexpected or null values, and data quality issues
- Resolve data import errors
- Select appropriate column data types
- Create and transform columns
- Group and aggregate rows
- Pivot, unpivot, and transpose data
- Convert semi-structured data to a table
- Create fact tables and dimension tables
- Identify when to use reference or duplicate queries and the resulting impact
- Merge and append queries
- Identify and create appropriate keys for relationships
- Configure data loading for queries

#### Model the Data (Weight: 25%)
- Configure table and column properties
- Implement role-playing dimensions
- Define a relationship's cardinality and cross-filter direction
- Create a common date table
- Identify use cases for calculated columns and calculated tables
- Create single aggregation measures
- Use the CALCULATE function
- Implement time intelligence measures
- Use basic statistical functions
- Create semi-additive measures
- Create a measure by using quick measures
- Create calculated tables or columns
- Create calculation groups
- Improve performance by identifying and removing unnecessary rows and columns
- Identify poorly performing measures, relationships, and visuals by using Performance Analyzer and DAX query view
- Improve performance by reducing granularity

#### Visualize and Analyze the Data (Weight: 25%)
- Select an appropriate visual
- Format and configure visuals
- Create a narrative visual with Copilot
- Apply and customize a theme
- Apply conditional formatting
- Apply slicing and filtering
- Use Copilot to create a new report page
- Use Copilot to suggest content for a new report page
- Configure the report page
- Choose when to use a paginated report
- Create visual calculations by using DAX
- Configure bookmarks
- Create custom tooltips
- Edit and configure interactions between visuals
- Configure navigation for a report
- Apply sorting to visuals
- Configure sync slicers
- Group and layer visuals by using the Selection pane
- Configure drill through navigation
- Configure export settings
- Design reports for mobile devices
- Enable personalized visuals in a report
- Design and configure Power BI reports for accessibility
- Configure automatic page refresh
- Use the Analyze feature in Power BI
- Use grouping, binning, and clustering
- Use AI visuals
- Use reference lines, error bars, and forecasting
- Detect outliers and anomalies
- Use Copilot to summarize the underlying semantic model

#### Manage and Secure Power BI (Weight: 15%)
- Create and configure a workspace
- Configure and update a workspace app
- Publish, import, or update items in a workspace
- Create dashboards
- Choose a distribution method
- Configure subscriptions and data alerts
- Promote or certify Power BI content
- Identify when a gateway is required
- Configure a semantic model scheduled refresh
- Assign workspace roles
- Configure item-level access
- Configure access to semantic models
- Implement row-level security roles
- Configure row-level security group membership
- Apply sensitivity labels

---

### Microsoft Azure Developer (AZ-204)
**Level:** Associate | **Provider:** Microsoft

#### Develop Azure Compute Solutions (Weight: 25%)
- Create and manage container images for solutions
- Publish an image to Azure Container Registry
- Run containers by using Azure Container Instances
- Create solutions by using Azure Container Apps
- Create an Azure App Service Web App
- Configure and implement diagnostics and logging
- Deploy code and containerized solutions
- Configure settings including Transport Layer Security (TLS), API settings, and service connections
- Implement autoscaling
- Configure deployment slots
- Create and configure an Azure Functions app
- Implement input and output bindings
- Implement function triggers by using data operations, timers, and webhooks

#### Develop for Azure Storage (Weight: 15%)
- Perform operations on containers and items by using the SDK
- Set the appropriate consistency level for operations
- Implement change feed notifications
- Set and retrieve properties and metadata
- Perform operations on data by using the appropriate SDK
- Implement storage policies and data lifecycle management

#### Implement Azure Security (Weight: 15%)
- Authenticate and authorize users by using the Microsoft Identity platform
- Authenticate and authorize users and apps by using Microsoft Entra ID
- Create and implement shared access signatures
- Implement solutions that interact with Microsoft Graph
- Secure app configuration data by using Azure App Configuration or Azure Key Vault
- Develop code that uses keys, secrets, and certificates stored in Azure Key Vault
- Implement Managed Identities for Azure resources

#### Monitor, Troubleshoot, and Optimize Azure Solutions (Weight: 5%)
- Monitor and analyze metrics, logs, and traces
- Implement availability tests and alerts
- Instrument an app or service to use Application Insights

#### Connect to and Consume Azure Services and Third-party Services (Weight: 20%)
- Create an Azure API Management instance
- Create and document APIs
- Configure access to APIs
- Implement policies for APIs
- Implement solutions that use Azure Event Grid
- Implement solutions that use Azure Event Hubs
- Implement solutions that use Azure Service Bus
- Implement solutions that use Azure Queue Storage

---

### Microsoft Azure Solutions Architect Expert (AZ-305)
**Level:** Expert | **Provider:** Microsoft

#### Design Identity, Governance, and Monitoring Solutions (Weight: 25%)
- Recommend a logging solution
- Recommend a solution for routing logs
- Recommend a monitoring solution
- Recommend an authentication solution
- Recommend an identity management solution
- Recommend a solution for authorizing access to Azure resources
- Recommend a solution for authorizing access to on-premises resources
- Recommend a solution to manage secrets, certificates, and keys
- Recommend a structure for management groups, subscriptions, and resource groups, and a strategy for resource tagging
- Recommend a solution for managing compliance
- Recommend a solution for identity governance

#### Design Data Storage Solutions (Weight: 20%)
- Recommend a solution for storing relational data
- Recommend a database service tier and compute tier
- Recommend a solution for database scalability
- Recommend a solution for data protection
- Recommend a solution for storing semi-structured data
- Recommend a solution for storing unstructured data
- Recommend a data storage solution to balance features, performance, and costs
- Recommend a data solution for protection and durability
- Recommend a solution for data integration
- Recommend a solution for data analysis

#### Design Business Continuity Solutions (Weight: 15%)
- Recommend a recovery solution for Azure and hybrid workloads that meets recovery objectives
- Recommend a backup and recovery solution for compute
- Recommend a backup and recovery solution for databases
- Recommend a backup and recovery solution for unstructured data
- Recommend a high availability solution for compute
- Recommend a high availability solution for relational data
- Recommend a high availability solution for semi-structured and unstructured data

#### Design Infrastructure Solutions (Weight: 30%)
- Specify components of a compute solution based on workload requirements
- Recommend a virtual machine-based solution
- Recommend a container-based solution
- Recommend a serverless-based solution
- Recommend a compute solution for batch processing
- Recommend a messaging architecture
- Recommend an event-driven architecture
- Recommend a solution for API integration
- Recommend a caching solution for applications
- Recommend an application configuration management solution
- Recommend an automated deployment solution for applications
- Evaluate a migration solution that leverages the Microsoft Cloud Adoption Framework for Azure
- Evaluate on-premises servers, data, and applications for migration
- Recommend a solution for migrating workloads to infrastructure as a service (IaaS) and platform as a service (PaaS)
- Recommend a solution for migrating databases
- Recommend a solution for migrating unstructured data
- Recommend a connectivity solution that connects Azure resources to the internet
- Recommend a connectivity solution that connects Azure resources to on-premises networks
- Recommend a solution to optimize network performance
- Recommend a solution to optimize network security
- Recommend a load-balancing and routing solution

---

### Microsoft DevOps Engineer Expert (AZ-400)
**Level:** Expert | **Provider:** Microsoft

#### Design and Implement Processes and Communications (Weight: 10%)
- Design and implement a structure for the flow of work, including GitHub Flow
- Design and implement a strategy for feedback cycles, including notifications and GitHub issues
- Design and implement integration for tracking work, including GitHub projects, Azure Boards, and repositories
- Design and implement source, bug, and quality traceability
- Design and implement a dashboard, including flow of work, such as cycle times, time to recovery, and lead time
- Design and implement appropriate metrics and queries for project planning
- Design and implement appropriate metrics and queries for development
- Design and implement appropriate metrics and queries for testing
- Design and implement appropriate metrics and queries for security
- Design and implement appropriate metrics and queries for delivery
- Design and implement appropriate metrics and queries for operations
- Document a project by configuring wikis and process diagrams, including Markdown and Mermaid syntax
- Configure release documentation, including release notes and API documentation
- Automate creation of documentation from Git history
- Configure integration by using webhooks
- Configure integration between Azure Boards and GitHub repositories
- Configure integration between GitHub or Azure DevOps and Microsoft Teams

#### Design and Implement a Source Control Strategy (Weight: 10%)
- Design a branch strategy, including trunk-based, feature branch, and release branch
- Design and implement a pull request workflow by using branch policies and branch protections
- Implement branch merging restrictions by using branch policies and branch protections
- Design and implement a strategy for managing large files, including Git Large File Storage (LFS) and git-fat
- Design a strategy for scaling and optimizing a Git repository, including Scalar and cross-repository sharing
- Configure permissions in the source control repository
- Configure tags to organize the source control repository
- Recover specific data by using Git commands
- Remove specific data from source control

#### Design and Implement Build and Release Pipelines (Weight: 50%)
- Recommend package management tools including GitHub Packages registry and Azure Artifacts
- Design and implement package feeds and views for local and upstream packages
- Design and implement a dependency versioning strategy for code assets and packages, including semantic versioning (SemVer) and date-based (CalVer)
- Design and implement a versioning strategy for pipeline artifacts
- Design and implement quality and release gates, including security and governance
- Design a comprehensive testing strategy, including local tests, unit tests, integration tests, and load tests
- Implement tests in a pipeline, including configuring test tasks, configuring test agents, and integration of test results
- Implement code coverage analysis
- Select a deployment automation solution, including GitHub Actions and Azure Pipelines
- Design and implement a GitHub runner or Azure DevOps agent infrastructure, including cost, tool selection, licenses, connectivity, and maintainability
- Design and implement integration between GitHub repositories and Azure Pipelines
- Develop and implement pipeline trigger rules
- Develop pipelines by using YAML
- Design and implement a strategy for job execution order, including parallelism and multi-stage pipelines
- Develop and implement complex pipeline scenarios, such as hybrid pipelines, VM templates, and self-hosted runners or agents
- Create reusable pipeline elements, including YAML templates, task groups, variables, and variable groups
- Design and implement checks and approvals by using YAML-based environments
- Design a deployment strategy, including blue-green, canary, ring, progressive exposure, feature flags, and A/B testing
- Design a pipeline to ensure that dependency deployments are reliably ordered
- Plan for minimizing downtime during deployments by using VIP swap, load balancing, rolling deployments, and deployment slot usage and swap
- Design a hotfix path plan for responding to high-priority code fixes
- Design and implement a resiliency strategy for deployment
- Implement feature flags by using Azure App Configuration Feature Manager
- Implement application deployment by using containers, binaries, and scripts
- Implement a deployment that includes database tasks
- Recommend a configuration management technology for application infrastructure
- Implement a configuration management strategy for application infrastructure
- Define an IaC strategy, including source control and automation of testing and deployment
- Design and implement desired state configuration for environments, including Azure Automation State Configuration, Azure Resource Manager, Bicep, and Azure Automanage Machine Configuration
- Design and implement Azure Deployment Environments for on-demand self-deployment
- Monitor pipeline health, including failure rate, duration, and flaky tests
- Optimize a pipeline for cost, time, performance, and reliability
- Optimize pipeline concurrency for performance and cost
- Design and implement a retention strategy for pipeline artifacts and dependencies
- Migrate a pipeline from classic to YAML in Azure Pipelines

#### Develop a Security and Compliance Plan (Weight: 10%)
- Choose between Service Principals and Managed Identity (including system-assigned and user-assigned)
- Implement and manage GitHub authentication, including GitHub Apps, GITHUB_TOKEN, and personal access tokens
- Implement and manage Azure DevOps service connections and personal access tokens
- Design and implement permissions and roles in GitHub
- Design and implement permissions and security groups in Azure DevOps
- Recommend appropriate access levels, including stakeholder access in Azure DevOps and outside collaborator access in GitHub
- Configure projects and teams in Azure DevOps
- Implement and manage secrets, keys, and certificates by using Azure Key Vault
- Implement and manage secrets in GitHub Actions and Azure Pipelines
- Design and implement a strategy for managing sensitive files during deployment, including Azure Pipelines secure files
- Design pipelines to prevent leakage of sensitive information
- Design a strategy for security and compliance scanning, including dependency, code, secret, and licensing scanning
- Configure Microsoft Defender for Cloud DevOps Security
- Configure GitHub Advanced Security for both GitHub and Azure DevOps
- Integrate GitHub Advanced Security with Microsoft Defender for Cloud
- Automate container scanning, including scanning container images and configuring an action to run CodeQL analysis in a container
- Automate analysis of licensing, vulnerabilities, and versioning of open-source components by using Dependabot alerts

#### Implement an Instrumentation Strategy (Weight: 5%)
- Configure Azure Monitor and Log Analytics to integrate with DevOps tools
- Configure collection of telemetry by using Application Insights, VM Insights, Container Insights, Storage Insights, and Network Insights
- Configure monitoring in GitHub, including enabling insights and creating and configuring charts
- Configure alerts for events in GitHub Actions and Azure Pipelines
- Inspect infrastructure performance indicators, including CPU, memory, disk, and network
- Analyze metrics by using collected telemetry, including usage and application performance
- Inspect distributed tracing by using Application Insights
- Interrogate logs using basic Kusto Query Language (KQL) queries

---

