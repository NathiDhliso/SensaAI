/**
 * Subject Domain Detector
 * 
 * Detects the domain/field from a subject name and provides
 * domain-specific terminology for cognitive thoughts during generation.
 */

export type Domain = 'medicine' | 'science' | 'tech' | 'business' | 'math' | 'engineering' | 'general';

interface DomainVocabulary {
    nodes: string[];
    concepts: string[];
    structures: string[];
    processes: string[];
}

const DOMAIN_VOCABULARIES: Record<Domain, DomainVocabulary> = {
    medicine: {
        nodes: ['neural pathways', 'physiological markers', 'diagnostic nodes', 'clinical indicators'],
        concepts: ['pathologies', 'syndromes', 'anatomical structures', 'therapeutic protocols'],
        structures: ['organ systems', 'cellular matrices', 'biochemical pathways', 'tissue architectures'],
        processes: ['metabolic cascades', 'homeostatic mechanisms', 'immune responses', 'genetic expressions']
    },
    science: {
        nodes: ['quantum states', 'molecular bonds', 'atomic structures', 'electromagnetic fields'],
        concepts: ['theoretical frameworks', 'empirical data', 'experimental paradigms', 'natural laws'],
        structures: ['periodic arrangements', 'crystalline lattices', 'cosmic formations', 'particle systems'],
        processes: ['chemical reactions', 'physical transformations', 'energy transfers', 'wave propagations']
    },
    tech: {
        nodes: ['data structures', 'algorithm trees', 'network topologies', 'binary nodes'],
        concepts: ['design patterns', 'architectural principles', 'protocols', 'computational models'],
        structures: ['class hierarchies', 'database schemas', 'API layers', 'system architectures'],
        processes: ['execution flows', 'data pipelines', 'authentication chains', 'compilation sequences']
    },
    business: {
        nodes: ['financial metrics', 'market indicators', 'operational KPIs', 'strategic touchpoints'],
        concepts: ['business models', 'revenue streams', 'value propositions', 'competitive advantages'],
        structures: ['organizational charts', 'supply chains', 'portfolio matrices', 'stakeholder networks'],
        processes: ['transaction flows', 'audit trails', 'forecasting models', 'valuation methods']
    },
    math: {
        nodes: ['mathematical objects', 'algebraic elements', 'geometric points', 'numerical nodes'],
        concepts: ['theorems', 'axioms', 'proofs', 'mathematical identities'],
        structures: ['vector spaces', 'function domains', 'matrix arrays', 'topological spaces'],
        processes: ['derivations', 'integrations', 'transformations', 'optimizations']
    },
    engineering: {
        nodes: ['mechanical systems', 'circuit nodes', 'structural points', 'control inputs'],
        concepts: ['engineering principles', 'design specifications', 'performance criteria', 'safety standards'],
        structures: ['load-bearing frameworks', 'circuit topologies', 'mechanical assemblies', 'thermal networks'],
        processes: ['stress analyses', 'signal processing', 'power distributions', 'material syntheses']
    },
    general: {
        nodes: ['knowledge nodes', 'concept vertices', 'information points', 'semantic nodes'],
        concepts: ['core principles', 'fundamental truths', 'key insights', 'essential frameworks'],
        structures: ['hierarchies', 'networks', 'taxonomies', 'frameworks'],
        processes: ['analytical sequences', 'logical chains', 'inference paths', 'reasoning flows']
    }
};

/**
 * Detect domain from subject name using keyword matching
 */
export function detectDomain(subject: string): Domain {
    const lower = subject.toLowerCase();
    
    // Medicine & Health
    if (/(medic|health|clinic|anatom|physiolog|patholog|pharmac|biolog|nursing|surgery|cardio|neuro|immun)/i.test(lower)) {
        return 'medicine';
    }
    
    // Science (Physics, Chemistry, Astronomy, etc.)
    if (/(physic|chemist|astro|quantum|molecul|atom|cosmic|planet|galaxy|astroph|thermodynam|optic)/i.test(lower)) {
        return 'science';
    }
    
    // Technology & IT
    if (/(software|program|coding|algorithm|data struct|comput|IT|cyber|network|database|cloud|aws|azure|python|java|javascript|react|api|devops|kubernetes|docker)/i.test(lower)) {
        return 'tech';
    }
    
    // Business & Finance
    if (/(business|finance|account|econom|market|management|MBA|entrepreneur|sales|revenue|profit|audit|tax|investment|banking|trade)/i.test(lower)) {
        return 'business';
    }
    
    // Mathematics
    if (/(math|calcul|algebra|geometr|statistic|trigono|probabilit|linear|discrete|number theory)/i.test(lower)) {
        return 'math';
    }
    
    // Engineering
    if (/(engineer|mechanical|electrical|civil|chemical eng|structural|circuit|CAD|thermodynam eng|fluid)/i.test(lower)) {
        return 'engineering';
    }
    
    return 'general';
}

/**
 * Get domain-specific vocabulary for a subject
 */
export function getDomainVocabulary(subject: string): DomainVocabulary {
    const domain = detectDomain(subject);
    return DOMAIN_VOCABULARIES[domain];
}

/**
 * Get a random term from a vocabulary category
 */
export function getRandomTerm(subject: string, category: keyof DomainVocabulary): string {
    const vocab = getDomainVocabulary(subject);
    const terms = vocab[category];
    return terms[Math.floor(Math.random() * terms.length)];
}

/**
 * Get domain name for display
 */
export function getDomainName(subject: string): string {
    const domain = detectDomain(subject);
    const names: Record<Domain, string> = {
        medicine: 'Medical',
        science: 'Scientific',
        tech: 'Technical',
        business: 'Business',
        math: 'Mathematical',
        engineering: 'Engineering',
        general: 'Knowledge'
    };
    return names[domain];
}
