import json
import re

def main():
    try:
        data = json.load(open('cw_logs.json'))
        # Find the line with the classification JSON for AZ-104
        # We know from earlier logs:
        # 16:18:12 [BedrockService] Classifying subject: Microsoft Azure Administrator (AZ-104)
        # Then ~5 seconds later it says "Classification response: <number> chars" followed by the JSON.
        
        target_log = None
        found_start = False
        
        for e in data:
            msg = e['message']
            if 'Classifying subject: Microsoft Azure Administrator (AZ-104)' in msg:
                found_start = True
            
            if found_start and 'Classification response:' in msg and '{' in msg:
                target_log = msg
                break
                
        if not target_log:
            print("Could not find the classification JSON in cw_logs.json")
            return
            
        print(f"Found log snippet: {target_log[:200]}...")
        
        # Extract the JSON using regex
        match = re.search(r'(\{[\s\S]*\})', target_log)
        if not match:
            print("Failed to match JSON")
            return
            
        json_str = match.group(1)
        import boto3
        from decimal import Decimal
        res = json.loads(json_str, parse_float=Decimal)
        print("Successfully parsed JSON with keys:", list(res.keys()))
        
        # Save payload back to dynamo
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.Table('sensapbl-jobs-dev')
        
        # Using the job and user IDs from the previous aws command
        job_id = '1522f842-255a-4938-a457-7561d2c63cf5'
        user_id = '54885448-f091-703b-2406-acd3bd74e748'
        
        table.update_item(
            Key={'jobId': job_id, 'userId': user_id},
            UpdateExpression='SET classification = :c',
            ExpressionAttributeValues={':c': res}
        )
        print("DynamoDB successfully updated with classification!")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
