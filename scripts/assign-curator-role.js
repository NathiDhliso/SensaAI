/**
 * Assign Curator Role to User
 * Updates Cognito user custom attribute to grant curator access
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_xNWax9wkH';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const USER_EMAIL = process.argv[2] || 'nkosinathi.dhliso@gmail.com';
const ROLE = process.argv[3] || 'curator'; // curator or admin

const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

async function assignRole() {
  try {
    console.log(`\n🔧 Assigning ${ROLE} role to ${USER_EMAIL}...`);
    
    // First, get the user to verify they exist
    try {
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: USER_EMAIL
      });
      
      const user = await client.send(getUserCommand);
      console.log(`✓ User found: ${user.Username}`);
      
      // Show current attributes
      const currentRole = user.UserAttributes?.find(attr => attr.Name === 'custom:role');
      if (currentRole) {
        console.log(`  Current role: ${currentRole.Value}`);
      } else {
        console.log(`  Current role: learner (default)`);
      }
      
    } catch (error) {
      console.error(`✗ User not found: ${USER_EMAIL}`);
      console.error(`  Error: ${error.message}`);
      process.exit(1);
    }
    
    // Update the custom:role attribute
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: USER_EMAIL,
      UserAttributes: [
        {
          Name: 'custom:role',
          Value: ROLE
        }
      ]
    });
    
    await client.send(command);
    
    console.log(`✓ Successfully assigned ${ROLE} role to ${USER_EMAIL}`);
    console.log(`\n📝 Next steps:`);
    console.log(`  1. User must log out and log back in for role to take effect`);
    console.log(`  2. New tokens will include the updated role`);
    console.log(`  3. User will have access to /curator routes\n`);
    
  } catch (error) {
    console.error(`\n✗ Failed to assign role:`);
    console.error(`  ${error.message}\n`);
    
    if (error.name === 'InvalidParameterException') {
      console.error(`💡 Tip: The custom:role attribute may not exist in your user pool.`);
      console.error(`   You need to add it in AWS Console:`);
      console.error(`   1. Go to Cognito User Pool`);
      console.error(`   2. Navigate to "Sign-up experience" > "Attributes"`);
      console.error(`   3. Add custom attribute: "role" (String, Mutable)\n`);
    }
    
    process.exit(1);
  }
}

// Show usage if no email provided
if (!process.argv[2]) {
  console.log(`\nUsage: node scripts/assign-curator-role.js <email> [role]`);
  console.log(`\nExamples:`);
  console.log(`  node scripts/assign-curator-role.js user@example.com curator`);
  console.log(`  node scripts/assign-curator-role.js user@example.com admin`);
  console.log(`\nDefault role: curator`);
  console.log(`Default email: nkosinathi.dhliso@gmail.com\n`);
}

assignRole();
