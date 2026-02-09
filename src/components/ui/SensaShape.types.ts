
export const SENSA_SHAPE_TYPES = [
 'nebula', 'synapse', 'construct', 'bastion', 'prism', 'seed', 'sprout', 'bloom', 'crown'
] as const;
export type SensaShapeType = typeof SENSA_SHAPE_TYPES[number];
export type SensaShapeSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';