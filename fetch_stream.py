import boto3
import json

def get_logs():
    client = boto3.client('logs', region_name='us-east-1')
    stream_name = '2026/02/21/[$LATEST]920e6665d05a48aeb65206db470632c6'
    
    try:
        response = client.get_log_events(
            logGroupName='/aws/lambda/sensapbl-generate-concepts-dev',
            logStreamName=stream_name,
            startFromHead=True
        )
        events = response['events']
    except Exception as e:
        print("Error:", e)
        return
        
    print(f"Fetched {len(events)} logs")
    
    target_json = None
    started = False
    
    for e in events:
        msg = e['message']
        if 'AZ-104' in msg:
            started = True
        
        if started and 'Classification response' in msg and '{' in msg:
             target_json = msg
             break
             
    if not target_json:
        print("Target not found")
        return
        
    import re
    match = re.search(r'(\{[\s\S]*\})', target_json)
    if not match: return
    
    from decimal import Decimal
    res = json.loads(match.group(1), parse_float=Decimal)
    print("KEYS:", list(res.keys()))
    
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('sensapbl-jobs-dev')
    
    table.update_item(
        Key={'jobId': '1522f842-255a-4938-a457-7561d2c63cf5', 'userId': '54885448-f091-703b-2406-acd3bd74e748'},
        UpdateExpression='SET classification = :c',
        ExpressionAttributeValues={':c': res}
    )
    print("DYNAMO OK!")

if __name__ == '__main__':
    get_logs()
