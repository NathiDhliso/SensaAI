export interface SimulatedPeer {
    id: string;
    name: string;
    role: string;
    expertise: 'novice' | 'intermediate' | 'expert';
    personality: 'critical' | 'supportive' | 'curious';
    avatarUrl?: string;
}

export const MOCK_PEERS: SimulatedPeer[] = [
    {
        id: 'peer-1',
        name: 'Sarah Chen',
        role: 'Data Architect',
        expertise: 'expert',
        personality: 'critical',
    },
    {
        id: 'peer-2',
        name: 'Marcus Johnson',
        role: 'Junior Dev',
        expertise: 'novice',
        personality: 'curious',
    },
    {
        id: 'peer-3',
        name: 'Elena Rodriguez',
        role: 'Product Manager',
        expertise: 'intermediate',
        personality: 'supportive',
    }
];

export interface PeerCallback {
    peerId: string;
    feedback: string;
    sentiment: 'positive' | 'neutral' | 'negative';
}
