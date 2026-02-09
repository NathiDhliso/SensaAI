export interface AIReviewer {
 id: string;
 name: string;
 role: string;
 expertise: 'novice' | 'intermediate' | 'expert';
 personality: 'critical' | 'supportive' | 'curious';
}

const EXPERTISE_LEVELS: AIReviewer['expertise'][] = ['novice', 'intermediate', 'expert'];
const PERSONALITIES: AIReviewer['personality'][] = ['critical', 'supportive', 'curious'];
const REVIEWER_NAMES = [
 'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
 'Riley', 'Quinn', 'Avery', 'Cameron', 'Drew'
];

export function generateReviewer(conceptName: string, index: number = 0): AIReviewer {
 const hash = conceptName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + index;
 const name = REVIEWER_NAMES[hash % REVIEWER_NAMES.length];
 const expertise = EXPERTISE_LEVELS[hash % EXPERTISE_LEVELS.length];
 const personality = PERSONALITIES[(hash + index) % PERSONALITIES.length];

 const rolesByExpertise: Record<AIReviewer['expertise'], string[]> = {
 novice: ['Student', 'Trainee', 'Apprentice'],
 intermediate: ['Practitioner', 'Analyst', 'Specialist'],
 expert: ['Senior Specialist', 'Lead', 'Consultant']
 };
 const roles = rolesByExpertise[expertise];
 const role = roles[(hash + index) % roles.length];

 return {
 id: `reviewer-${hash}-${index}`,
 name,
 role,
 expertise,
 personality
 };
}

export interface PeerCallback {
 peerId: string;
 feedback: string;
 sentiment: 'positive' | 'neutral' | 'negative';
}