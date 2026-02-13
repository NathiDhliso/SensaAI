
const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const REGION = "us-east-1";
const JOBS_TABLE = "sensapbl-jobs-dev";
const CONCEPTS_TABLE = "sensapbl-concepts-dev";

const client = new DynamoDBClient({ region: REGION });

async function monitor() {
    console.log("🔍 Starting Job Monitor...");
    console.log(`Region: ${REGION}`);
    console.log(`Watching Table: ${JOBS_TABLE}`);
    console.log("Waiting for new jobs (Ctrl+C to stop)...");

    const seenJobs = new Set();
    let isFirstRun = true;

    while (true) {
        try {
            const command = new ScanCommand({
                TableName: JOBS_TABLE,
                Limit: 5
            });

            const response = await client.send(command);
            const jobs = response.Items ? response.Items.map(unmarshall) : [];

            jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (jobs.length > 0) {
                const latestJob = jobs[0];

                if (!seenJobs.has(latestJob.jobId)) {
                    seenJobs.add(latestJob.jobId);

                    if (!isFirstRun) {
                        console.log("\n✨ NEW JOB DETECTED!");
                        console.log(`Job ID: ${latestJob.jobId}`);
                        console.log(`Subject: ${latestJob.subject}`);
                        console.log(`Status: ${latestJob.status}`);
                        console.log(`Created: ${latestJob.createdAt}`);
                        await checkConceptCount(latestJob.jobId);
                    } else {
                        const jobTime = new Date(latestJob.createdAt).getTime();
                        const now = Date.now();
                        if (now - jobTime < 60000) {
                            console.log("\n✨ RECENT ACTIVE JOB FOUND:");
                            console.log(`Job ID: ${latestJob.jobId}`);
                            console.log(`Subject: ${latestJob.subject}`);
                            await checkConceptCount(latestJob.jobId);
                        }
                    }
                } else {
                    if (latestJob.status === 'processing' || latestJob.status === 'pending') {
                        process.stdout.write(".");
                        // Periodically check count for active jobs
                        if (Math.random() > 0.8) {
                            await checkConceptCount(latestJob.jobId);
                        }
                    }
                }
            }

            isFirstRun = false;

        } catch (error) {
            console.error("Error scanning jobs:", error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function checkConceptCount(jobId) {
    try {
        const command = new QueryCommand({
            TableName: CONCEPTS_TABLE,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": { S: jobId }
            },
            Select: "COUNT"
        });

        const response = await client.send(command);
        console.log(`\n📊 Concept Count: ${response.Count} / 100 Goal`);

        if (response.Count >= 100) {
            console.log("✅ GOAL REACHED! 100 Concepts Generated!");
        }

    } catch (e) {
        console.error("Error checking concepts:", e.message);
    }
}

monitor();
