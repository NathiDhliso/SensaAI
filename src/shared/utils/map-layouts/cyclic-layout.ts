/**
 * Cyclic Layout Engine
 *
 * Closed-loop topology — phases arranged in a circle with a
 * return arc from the last phase back to the first, emphasising
 * the repeating nature of cyclic subjects (adaptive curricula,
 * language learning, iterative processes).
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const LOOP_RADIUS = 260;
const SATELLITE_DISTANCE = 130;
const SNAP = 20;

function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
}

export function cyclicLayout(
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;

    // Extract phase verbs from lifecycle blueprints
    const phaseVerbs: string[] = [];
    if (lifecycleBlueprints?.phase1) phaseVerbs.push(lifecycleBlueprints.phase1.verb);
    if (lifecycleBlueprints?.phase2) phaseVerbs.push(lifecycleBlueprints.phase2.verb);
    if (lifecycleBlueprints?.phase3) phaseVerbs.push(lifecycleBlueprints.phase3.verb);
    if (phaseVerbs.length === 0) phaseVerbs.push('INPUT', 'PROCESS', 'OUTPUT');

    // Separate by tier
    const trunks = concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk');
    const branches = concepts.filter(c => (c.tier || '').toLowerCase() === 'branch');
    const leaves = concepts.filter(c => {
        const t = (c.tier || '').toLowerCase();
        return t !== 'trunk' && t !== 'branch';
    });

    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    // Build phase nodes around the loop from trunks + branches
    // Each phase is a major stop on the cycle
    const phasePool = [...trunks, ...branches];
    const phaseCount = Math.max(phasePool.length, phaseVerbs.length);
    const phaseNodes: PositionedNode[] = [];

    for (let i = 0; i < phaseCount; i++) {
        // Distribute evenly around the circle, starting from top
        const angle = (i / phaseCount) * Math.PI * 2 - Math.PI / 2;
        const concept = phasePool[i];
        const nodeId = concept
            ? `node-cycl-phase-${concept.id}`
            : `node-cycl-phase-verb-${i}`;

        const node: PositionedNode = {
            id: nodeId,
            conceptId: concept?.id || `__phase_${i}__`,
            conceptName: concept?.name || phaseVerbs[i % phaseVerbs.length],
            x: snap(cx + LOOP_RADIUS * Math.cos(angle)),
            y: snap(cy + LOOP_RADIUS * Math.sin(angle)),
            meta: {
                role: 'phase',
                sequenceNumber: i,
                verbLabel: phaseVerbs[i % phaseVerbs.length],
                phaseAngle: angle,
            },
        };
        nodes.push(node);
        phaseNodes.push(node);
    }

    // Sequential edges between consecutive phases (curved arrows)
    for (let i = 0; i < phaseNodes.length; i++) {
        const next = (i + 1) % phaseNodes.length;
        const isReturn = next === 0; // last → first is the return arc
        edges.push({
            id: `edge-cycl-${i}-${next}`,
            fromId: phaseNodes[i].id,
            toId: phaseNodes[next].id,
            style: isReturn ? 'dashed' : 'solid',
            markers: isReturn ? ['return-arrow'] : ['forward-arrow'],
            label: isReturn ? 'iterate' : undefined,
            curvature: 0.15,
        });
    }

    // Satellite concepts for each phase — leaves or leftover
    const assignedLeaves: Map<number, LearningConcept[]> = new Map();
    for (let i = 0; i < phaseNodes.length; i++) assignedLeaves.set(i, []);

    for (const leaf of leaves) {
        let bestPhase = 0;
        // Match by parentName or trunkDomain
        if (leaf.parentName) {
            const match = phaseNodes.findIndex(p => p.conceptName === leaf.parentName);
            if (match >= 0) bestPhase = match;
        } else if (leaf.trunkDomain) {
            const match = phaseNodes.findIndex(p => p.conceptName === leaf.trunkDomain);
            if (match >= 0) bestPhase = match;
        }
        // Fallback: round-robin by least assigned
        if (!leaf.parentName && !leaf.trunkDomain) {
            let minCount = Infinity;
            for (const [idx, arr] of assignedLeaves.entries()) {
                if (arr.length < minCount) { minCount = arr.length; bestPhase = idx; }
            }
        }
        assignedLeaves.get(bestPhase)!.push(leaf);
    }

    // Position satellites around their parent phase node
    for (const [phaseIdx, satellites] of assignedLeaves.entries()) {
        const parentAngle = phaseNodes[phaseIdx].meta.phaseAngle as number;
        // Fan satellites outward from the loop center
        for (let j = 0; j < satellites.length; j++) {
            const leaf = satellites[j];
            const spreadArc = 0.3;
            const midpoint = (satellites.length - 1) / 2;
            const offsetAngle = parentAngle + (j - midpoint) * spreadArc;

            const nodeId = `node-cycl-sat-${leaf.id}`;
            nodes.push({
                id: nodeId,
                conceptId: leaf.id,
                conceptName: leaf.name,
                x: snap(cx + (LOOP_RADIUS + SATELLITE_DISTANCE) * Math.cos(offsetAngle)),
                y: snap(cy + (LOOP_RADIUS + SATELLITE_DISTANCE) * Math.sin(offsetAngle)),
                meta: {
                    role: 'step',
                    sequenceNumber: j,
                    ringIndex: 1,
                },
            });

            // Dotted line to parent phase
            edges.push({
                id: `edge-cycl-sat-${phaseIdx}-${j}`,
                fromId: phaseNodes[phaseIdx].id,
                toId: nodeId,
                style: 'dotted',
            });
        }
    }

    // Main loop ring overlay
    overlays.push({
        type: 'orbital-ring',
        cx, cy,
        radius: LOOP_RADIUS,
        label: 'Cycle',
        color: 'var(--map-cycl-line-light)',
    });

    // Return arc overlay
    overlays.push({
        type: 'return-arc',
        cx, cy,
        radius: LOOP_RADIUS + 40,
        startAngle: ((phaseNodes.length - 1) / phaseNodes.length) * Math.PI * 2 - Math.PI / 2,
        endAngle: -Math.PI / 2,
        color: 'var(--map-cycl-accent)',
    });

    return { nodes, edges, overlays, classification: 'cyclic' };
}
