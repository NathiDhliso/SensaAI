/**
 * BionicText Component - DEPRECATED FEATURE
 * 
 * Formerly rendered text with Bionic Reading. 
 * Now just renders standard text as the feature has been removed.
 */

interface BionicTextProps {
    children: string;
    className?: string;
}

export function BionicText({ children, className }: BionicTextProps) {
    return <span className={className}>{children}</span>;
}

export default BionicText;
