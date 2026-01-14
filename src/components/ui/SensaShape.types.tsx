
export const SENSA_SHAPE_TYPES = [
    'nebula', 'synapse', 'construct', 'bastion', 'prism', 'seed', 'sprout', 'bloom', 'crown'
] as const;

export type SensaShapeType = typeof SENSA_SHAPE_TYPES[number];

export type SensaShapeSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const renderShapeOrIcon = (icon: React.ReactNode | string, SensaShapeComponent: React.ComponentType<any>, size: SensaShapeSize = 'md', className: string = '') => {
    if (typeof icon === 'string' && icon.startsWith('shape:')) {
        const type = icon.replace('shape:', '') as SensaShapeType;
        return <SensaShapeComponent type={type} size={size} className={className} />;
    }
    return <span className={className}>{icon}</span>;
};
