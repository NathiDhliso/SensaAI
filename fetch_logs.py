import boto3
import json
from datetime import datetime, timedelta

def main():
    client = boto3.client('logs', region_name='us-east-1')
    start_time = int((datetime.utcnow() - timedelta(hours=3)).timestamp() * 1000)
    
    events = []
    paginator = client.get_paginator('filter_log_events')
    for page in paginator.paginate(
        logGroupName='/aws/lambda/sensapbl-generate-concepts-dev',
        startTime=start_time
    ):
        events.extend(page.get('events', []))
        
    # Sort and dump
    events.sort(key=lambda x: x['timestamp'])
    with open('cw_logs.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2)
        
    print(f"Saved {len(events)} events to cw_logs.json")

if __name__ == '__main__':
    main()
