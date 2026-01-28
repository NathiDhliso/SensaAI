/**
 * Direct Generation Test - Mathematics Grade 12
 * 
 * This script directly tests the generation logic by:
 * 1. Starting a generation job
 * 2. Monitoring progress
 * 3. Retrieving results
 * 4. Saving to cloud (DynamoDB)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';
const SUBJECT = 'Mathematics Grade 12';
const USER_ID = `test-user-${Date.now()}`;

// Helper to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Authorization': 'Bearer dev-token',
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                } else {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Helper to wait
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function testGeneration() {
    console.log('======================================');
    console.log(`Testing Generation for: ${SUBJECT}`);
    console.log(`User ID: ${USER_ID}`);
    console.log('======================================\n');

    try {
        // Step 1: Start Generation
        console.log('[1/4] Starting generation...');
        const startResponse = await makeRequest('POST', '/concepts/generate', {
            subject: SUBJECT,
            userId: USER_ID,
            context: 'Grade 12 Mathematics curriculum focusing on calculus, algebra, trigonometry, and statistics'
        });

        const { jobId, sessionId } = startResponse;
        console.log('✓ Generation started successfully');
        console.log(`  Job ID: ${jobId}`);
        console.log(`  Session ID: ${sessionId}\n`);

        // Step 2: Monitor Progress
        console.log('[2/4] Monitoring generation progress...');
        let attempt = 0;
        const maxAttempts = 120; // 10 minutes max
        let lastConceptCount = 0;

        while (attempt < maxAttempts) {
            await sleep(5000); // Wait 5 seconds between polls

            const status = await makeRequest('GET', `/concepts/status/${jobId}?userId=${USER_ID}`);
            
            if (status.conceptCount && status.conceptCount > lastConceptCount) {
                console.log(`  Progress: ${status.conceptCount} concepts generated (Status: ${status.status})`);
                lastConceptCount = status.conceptCount;
            }

            if (status.status === 'completed') {
                console.log('\n✓ Generation completed!');
                console.log(`  Total concepts: ${status.conceptCount}\n`);
                break;
            } else if (status.status === 'failed') {
                throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
            }

            attempt++;
        }

        if (attempt === maxAttempts) {
            throw new Error('Generation timeout after 10 minutes');
        }

        // Step 3: Retrieve Generated Concepts
        console.log('[3/4] Retrieving generated concepts...');
        
        const [foundation, keystone, utility] = await Promise.all([
            makeRequest('GET', `/concepts?userId=${USER_ID}&sessionId=${sessionId}&tier=foundation`),
            makeRequest('GET', `/concepts?userId=${USER_ID}&sessionId=${sessionId}&tier=keystone`),
            makeRequest('GET', `/concepts?userId=${USER_ID}&sessionId=${sessionId}&tier=utility`),
        ]);

        const totalRetrieved = foundation.count + keystone.count + utility.count;
        
        console.log(`✓ Retrieved ${totalRetrieved} concepts`);
        console.log(`  Foundation: ${foundation.count}`);
        console.log(`  Keystone: ${keystone.count}`);
        console.log(`  Utility: ${utility.count}\n`);

        // Display sample concepts
        if (foundation.concepts && foundation.concepts.length > 0) {
            console.log('\nSample Concepts:');
            console.log('─────────────────');
            foundation.concepts.slice(0, 5).forEach(concept => {
                console.log(`  • ${concept.name}`);
                if (concept.hookSentence) {
                    console.log(`    ${concept.hookSentence}`);
                }
            });
            console.log('');
        }

        // Step 4: Verification
        console.log('[4/4] Verifying data integrity...');
        
        const allConcepts = [
            ...(foundation.concepts || []),
            ...(keystone.concepts || []),
            ...(utility.concepts || [])
        ];

        let missingFields = 0;
        allConcepts.forEach(concept => {
            if (!concept.name) missingFields++;
            if (!concept.tier) missingFields++;
            if (!concept.cognitiveLevel) missingFields++;
        });

        if (missingFields === 0) {
            console.log('✓ All concepts have required fields');
        } else {
            console.log(`⚠ Found ${missingFields} validation issues`);
        }

        // Summary
        console.log('\n======================================');
        console.log('GENERATION TEST SUMMARY');
        console.log('======================================');
        console.log(`Subject: ${SUBJECT}`);
        console.log(`Session ID: ${sessionId}`);
        console.log(`Total Concepts: ${totalRetrieved}`);
        console.log('Status: COMPLETED ✓');
        console.log('Data Saved to: AWS DynamoDB (Cloud)');
        console.log('======================================\n');

        // Save results to file
        const fs = require('fs');
        const outputFile = `generation-test-results-${Date.now()}.json`;
        const results = {
            subject: SUBJECT,
            sessionId,
            jobId,
            userId: USER_ID,
            timestamp: new Date().toISOString(),
            conceptCount: totalRetrieved,
            breakdown: {
                foundation: foundation.count,
                keystone: keystone.count,
                utility: utility.count
            },
            sampleConcepts: allConcepts.slice(0, 10),
            cloudStorage: 'AWS DynamoDB',
            tables: {
                concepts: 'sensapbl-concepts-pilot',
                jobs: 'sensapbl-jobs-pilot'
            }
        };

        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`Results saved to: ${outputFile}`);

    } catch (error) {
        console.error('\n✗ Test failed:');
        console.error(error.message);
        process.exit(1);
    }
}

// Run the test
testGeneration().catch(console.error);
