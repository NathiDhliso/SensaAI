
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend root (assuming CWD is backend root)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const region = process.env.AWS_REGION || 'us-east-1';
const JOBS_TABLE = process.env.JOBS_TABLE || 'sensapbl-jobs-pilot';

console.log(`🔌 Connecting to DynamoDB in ${region}...`);
console.log(`📋 Target Table: ${JOBS_TABLE}`);

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

async function cleanupDuplicates() {
    try {
        console.log('🔍 Scanning for jobs...');

        // Scan all jobs (for a pilot/dev env this is fine; for prod we'd query by user)
        const result = await docClient.send(new ScanCommand({
            TableName: JOBS_TABLE,
        }));

        const jobs = result.Items || [];
        console.log(`found ${jobs.length} total jobs.`);

        // Group by Subject + User
        const groups = new Map<string, any[]>();

        // Helper: Levenshtein Distance
        const levenshtein = (a: string, b: string): number => {
            const matrix = [];
            for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
            for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) == a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        // Helper: Smart Normalize
        const normalizeSubject = (str: string): string => {
            let s = str.toLowerCase();
            // Synonyms
            s = s.replace(/azure/g, 'az');
            s = s.replace(/administrator/g, 'admin');
            s = s.replace(/microsoft/g, 'ms');
            s = s.replace(/certification/g, 'cert');
            // Strip non-alphanumeric
            return s.replace(/[^a-z0-9]/g, '');
        };

        jobs.forEach(job => {
            const norm = normalizeSubject(job.subject);
            // We initially group by this smart-normalized key
            const key = `${job.userId}|${norm}`;
            const group = groups.get(key) || [];
            group.push(job);
            groups.set(key, group);
        });

        // Phase 2: Fuzzy Merge Groups
        const keys = Array.from(groups.keys());
        const mergedGroups = new Map<string, any[]>();
        const processedKeys = new Set<string>();

        for (const keyA of keys) {
            if (processedKeys.has(keyA)) continue;

            const [userA, subjectA] = keyA.split('|');
            const combinedGroup = [...groups.get(keyA)!];
            processedKeys.add(keyA);

            // Compare with all other keys for the same user
            for (const keyB of keys) {
                if (keyA === keyB || processedKeys.has(keyB)) continue;

                const [userB, subjectB] = keyB.split('|');
                if (userA !== userB) continue;

                // Check distance
                const dist = levenshtein(subjectA, subjectB);
                // Threshold: 1 for short strings, 2 for longer
                const threshold = subjectA.length < 5 ? 1 : 2;

                if (dist <= threshold) {
                    console.log(`\n🧩 Fuzzy Match Found: "${subjectA}" ~= "${subjectB}" (Dist: ${dist})`);
                    combinedGroup.push(...groups.get(keyB)!);
                    processedKeys.add(keyB);
                }
            }

            mergedGroups.set(keyA, combinedGroup);
        }

        // Debug: Print final merged groups
        console.log('\n--- Duplicate Candidates (After Smart Merge) ---');
        for (const [key, group] of mergedGroups.entries()) {
            if (group.length > 1) {
                const [_, subject] = key.split('|');
                console.log(`Group "${subject}" -> Count: ${group.length}`);
                group.forEach(j => console.log(`  - "${j.subject}"`));
            }
        }
        console.log('-----------------------------\n');

        let deletedCount = 0;

        for (const [_, group] of mergedGroups.entries()) {
            if (group.length > 1) {
                // Sort by createdAt descending (newest first)
                // Handle missing createdAt by treating as 0 (very old)
                group.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

                const newest = group[0];
                const toDelete = group.slice(1);

                console.log(`\nDuplicate Group: "${newest.subject}" (User: ${newest.userId})`);
                console.log(`Keep: ${newest.jobId} (${new Date((newest.createdAt || 0) * 1000).toISOString()})`);

                for (const job of toDelete) {
                    console.log(`DELETE: ${job.jobId} (${new Date((job.createdAt || 0) * 1000).toISOString()})`);

                    await docClient.send(new DeleteCommand({
                        TableName: JOBS_TABLE,
                        Key: {
                            jobId: job.jobId,
                            userId: job.userId
                        }
                    }));

                    deletedCount++;
                }
            }
        }
        console.log(`\n✅ Cleanup Complete!`);
        console.log(`🗑️  Deleted ${deletedCount} duplicate jobs.`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

cleanupDuplicates();
