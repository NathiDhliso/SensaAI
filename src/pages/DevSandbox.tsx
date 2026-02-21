import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GymActivityLauncher from '@/components/learning/gym/GymActivityLauncher';
import type { LearningConcept } from '@/shared/types/learning';

// --- MOCK DATA TO PREVENT CRASHES ---
const MOCK_CONCEPTS: LearningConcept[] = [
    {
        id: 'mock-1',
        name: 'Virtual Private Cloud (VPC)',
        stageId: 'stage-1',
        order: 1,
        lifecyclePhase: 'PREPARE',
        dependencies: [],
        outdegree: 0,
        tier: 'trunk',
        technicalDetails: 'A logically isolated section of the AWS Cloud.',
        keyPoints: ['Isolation', 'Subnets', 'Routing'],
        commonPitfalls: ['Overlapping CIDR blocks'],
        howToUse: ['Create VPC', 'Add Subnets']
    },
    {
        id: 'mock-2',
        name: 'Internet Gateway (IGW)',
        stageId: 'stage-1',
        order: 2,
        lifecyclePhase: 'PREPARE',
        dependencies: [],
        outdegree: 0,
        tier: 'branch',
        technicalDetails: 'Allows communication between your VPC and the internet.',
        keyPoints: ['Public Access', 'Attached to VPC'],
        commonPitfalls: ['Forgetting route table entry'],
        howToUse: ['Attach to VPC', 'Update Route Table']
    }
];

export default function DevSandbox() {
    const navigate = useNavigate();
    const [forcedActivity, setForcedActivity] = useState<string | null>(null);

    // A dummy ID to make URL params happy for pages that require them
    const DUMMY_SUBJECT = '6f1cd23f-c806-46b3-8ee9-e78022d03c71';

    // --- COMPONENT OVERRIDE RENDERER ---
    if (forcedActivity) {
        return (
            <div style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh', color: 'white' }}>
                <button
                    onClick={() => setForcedActivity(null)}
                    style={{ padding: '8px 16px', marginBottom: '20px', background: '#ef4444', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Close Forced Activity & Return to Dev Sandbox
                </button>

                {/* Render the specific activity forcefully */}
                {forcedActivity === 'peer-review' && <GymActivityLauncher activity="peer-review" concepts={MOCK_CONCEPTS} onBack={() => setForcedActivity(null)} />}
                {forcedActivity === 'pre-mortem' && <GymActivityLauncher activity="pre-mortem" concepts={MOCK_CONCEPTS} onBack={() => setForcedActivity(null)} />}
                {forcedActivity === 'concept-map' && <GymActivityLauncher activity="concept-map" concepts={MOCK_CONCEPTS} onBack={() => setForcedActivity(null)} />}
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', background: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
            <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>🛠 Developer God-Mode Sandbox</h1>
            <p style={{ color: '#888', marginBottom: '30px' }}>Force-navigate to any page or directly render isolated components.</p>

            {/* SECTION 1: FORCE COMPONENTS (Bypass Routing completely) */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ color: '#a855f7' }}>1. Force Render Gym Activities (Isolated / Mock Data)</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => setForcedActivity('concept-map')} style={btnStyle}>Isolated Build Map</button>
                    <button onClick={() => setForcedActivity('peer-review')} style={btnStyle}>Isolated Peer Review</button>
                    <button onClick={() => setForcedActivity('pre-mortem')} style={btnStyle}>Isolated Pre-Mortem</button>
                </div>
            </section>

            {/* SECTION 2: APP PAGES */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ color: '#3b82f6' }}>2. Core Navigation Routes</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/')} style={btnStyle}>Home</button>
                    <button onClick={() => navigate('/login')} style={btnStyle}>Login</button>
                    <button onClick={() => navigate('/library')} style={btnStyle}>Mastery Dashboard</button>
                    <button onClick={() => navigate('/generate')} style={btnStyle}>Content Generator</button>
                    <button onClick={() => navigate('/community')} style={btnStyle}>Community Library</button>
                </div>
            </section>

            {/* SECTION 3: DYNAMIC SUBJECT PAGES */}
            <section>
                <h2 style={{ color: '#10b981' }}>3. Dynamic Pages (Uses Real Subject Data via ID)</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/launchpad/${DUMMY_SUBJECT}`)} style={btnStyle}>Content Launchpad (Gym Overview)</button>
                    <button onClick={() => navigate(`/study/${DUMMY_SUBJECT}?tab=learn`)} style={btnStyle}>Unified Study Room (Learn/Velocity)</button>
                    <button onClick={() => navigate(`/study/${DUMMY_SUBJECT}?tab=learn&activity=concept-map`)} style={btnStyle}>Dynamic Build Map</button>
                    <button onClick={() => navigate(`/study/${DUMMY_SUBJECT}?tab=learn&activity=peer-review`)} style={btnStyle}>Dynamic Peer Review</button>
                    <button onClick={() => navigate(`/study/${DUMMY_SUBJECT}?tab=learn&activity=pre-mortem`)} style={btnStyle}>Dynamic Pre-Mortem</button>
                </div>
            </section>
        </div>
    );
}

const btnStyle = {
    padding: '12px 20px',
    background: '#222',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
};
