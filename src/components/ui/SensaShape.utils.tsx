import React from 'react';
import type { SensaShapeType, SensaShapeSize } from './SensaShape.types';
export interface SensaShapeComponentProps {
 type: SensaShapeType;
 size: SensaShapeSize;
 className?: string;
}
export const renderShapeOrIcon = (
 icon: React.ReactNode | string,
 SensaShapeComponent: React.ComponentType<SensaShapeComponentProps>,
 size: SensaShapeSize = 'md',
 className: string = ''
) => {
 if (typeof icon === 'string' && icon.startsWith('shape:')) {
 const type = icon.replace('shape:', '') as SensaShapeType;
 return <SensaShapeComponent type={type} size={size} className={className} />;
 }
 return <span className={className}>{icon}</span>;
};