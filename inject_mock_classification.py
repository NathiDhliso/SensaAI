import boto3
import json
from decimal import Decimal

def main():
    az104_classification = {
        "subjectType": "procedural",
        "classification": {
            "type": "procedural",
            "label": "Process Execution Workflow",
            "goal": "Mastery of structured methodologies and step-by-step procedures",
            "confidence": 0.95,
            "reasoning": "Azure Administrator (AZ-104) is centered on configuring, managing, and maintaining cloud resources through defined processes."
        },
        "deepStructure": [
            {
                "name": "Identity and Access Control",
                "type": "invariant",
                "description": "The foundational principle that every resource requires authenticated and authorized access governed by RBAC and Entra ID."
            },
            {
                "name": "Resource Organization and Governance",
                "type": "invariant",
                "description": "Structured management of cloud assets using subscriptions, resource groups, tags, and Azure Policies."
            },
            {
                "name": "Network Connectivity and Security",
                "type": "invariant",
                "description": "The principle of isolating, connecting, and securing resources using VNets, NSGs, and routing topologies."
            }
        ],
        "lifecycleBlueprints": {
            "phases": [
                {
                    "name": "Provisioning",
                    "objective": "Deploy requested Azure resources",
                    "actions": ["Select region and SKU", "Configure networking options", "Apply tags and policies", "Execute deployment via Portal/CLI/Bicep"]
                },
                {
                    "name": "Configuration",
                    "objective": "Set up resource settings and integrations",
                    "actions": ["Assign RBAC roles", "Configure diagnostic settings", "Set up backups/disaster recovery", "Integrate with monitoring tools"]
                },
                {
                    "name": "Monitoring and Maintenance",
                    "objective": "Ensure health, security, and performance",
                    "actions": ["Review Azure Monitor alerts", "Apply OS updates via Update Manager", "Scale resources as needed", "Audit logs and metrics"]
                }
            ],
            "transitionRules": [
                "Resources cannot be configured until successfully provisioned and running.",
                "Monitoring must be active before a resource is considered fully operational."
            ]
        },
        "examDomains": [
            {
                "name": "Manage Azure identities and governance",
                "weight": 0.20,
                "subtopics": ["Manage Azure AD objects", "Manage role-based access control (RBAC)", "Manage subscriptions and governance"]
            },
            {
                "name": "Implement and manage storage",
                "weight": 0.15,
                "subtopics": ["Manage storage accounts", "Manage data in Azure Storage", "Configure Azure files and Azure Blob Storage"]
            },
            {
                "name": "Deploy and manage Azure compute resources",
                "weight": 0.20,
                "subtopics": ["Automate deployment of VMs", "Create and configure VMs", "Create and configure containers", "Create and configure Azure App Service"]
            },
            {
                "name": "Implement and manage virtual networking",
                "weight": 0.25,
                "subtopics": ["Implement and manage virtual networking", "Secure access to virtual networks", "Configure load balancing", "Monitor and troubleshoot virtual networking", "Integrate an on-premises network with an Azure virtual network"]
            },
            {
                "name": "Monitor and maintain Azure resources",
                "weight": 0.20,
                "subtopics": ["Monitor resources by using Azure Monitor", "Implement backup and recovery"]
            }
        ]
    }
    
    # Save payload back to dynamo for the specific AZ-104 job
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('sensapbl-jobs-dev')
    
    # Using the job and user IDs from your AZ-104 job
    job_id = '1522f842-255a-4938-a457-7561d2c63cf5'
    user_id = '54885448-f091-703b-2406-acd3bd74e748'
    
    # Convert floats to Decimal for DynamoDB
    payload = json.loads(json.dumps(az104_classification), parse_float=Decimal)
    
    table.update_item(
        Key={'jobId': job_id, 'userId': user_id},
        UpdateExpression='SET classification = :c',
        ExpressionAttributeValues={':c': payload}
    )
    print("DynamoDB successfully updated with mock classification!")

if __name__ == "__main__":
    main()
