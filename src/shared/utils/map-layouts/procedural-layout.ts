/**
 * Procedural Layout Engine
 * 
 * Radial fan topology — arms extend outward from a center diamond.
 * Each arm represents a ULC verb (CREATE, CONFIGURE, MONITOR).
 * Steps fan outward along each arm in numbered sequence.
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const PHI = 1.618;
const BASE_RADIUS = 160;
const STEP_SPACING = 120;
const JITTER_DEG = 3;
const SNAP = 20;

function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
}

export function proceduralLayout(
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;

    // Extract verbs from lifecycle blueprints — ALWAYS guarantee ≥ 3 arms
    const verbs: string[] = [];
    const FALLBACK_VERBS = ['EXPLORE', 'BUILD', 'REVIEW'];
    if (lifecycleBlueprints?.phase1) verbs.push(lifecycleBlueprints.phase1.verb);
    if (lifecycleBlueprints?.phase2) verbs.push(lifecycleBlueprints.phase2.verb);
    if (lifecycleBlueprints?.phase3) verbs.push(lifecycleBlueprints.phase3.verb);

    // Pad to at least 3 arms so layout is always a fan, not a line
    while (verbs.length < 3) {
        verbs.push(FALLBACK_VERBS[verbs.length] || `ARM ${verbs.length + 1}`);
    }

    // Build sequence lookup from blueprints (concept name → arm index)
    const sequenceLookup = new Map<string, number>();
    const phases = [lifecycleBlueprints?.phase1, lifecycleBlueprints?.phase2, lifecycleBlueprints?.phase3];
    for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        if (phase?.sequence) {
            for (const seqItem of phase.sequence) {
                sequenceLookup.set(seqItem.toLowerCase(), pi);
            }
        }
    }

    // Separate trunks from other concepts
    const trunks = concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk');
    const nonTrunks = concepts.filter(c => (c.tier || '').toLowerCase() !== 'trunk');

    // Group non-trunk concepts into arms by various heuristics
    const arms: Map<number, LearningConcept[]> = new Map();
    for (let i = 0; i < verbs.length; i++) arms.set(i, []);

    // Assign each concept to an arm using multiple heuristics
    for (let ci = 0; ci < nonTrunks.length; ci++) {
        const c = nonTrunks[ci];
        let assigned = false;

        // Heuristic 1: blueprintSteps verb match
        if (!assigned && c.blueprintSteps && c.blueprintSteps.length > 0) {
            for (let vi = 0; vi < verbs.length; vi++) {
                const vLower = verbs[vi].toLowerCase();
                if (c.blueprintSteps.some((bs: { verb?: string }) => bs.verb?.toLowerCase() === vLower)) {
                    arms.get(vi)!.push(c);
                    assigned = true;
                    break;
                }
            }
        }

        // Heuristic 2: sequence lookup from lifecycle blueprints
        if (!assigned) {
            const armFromSeq = sequenceLookup.get(c.name.toLowerCase());
            if (armFromSeq !== undefined && armFromSeq < verbs.length) {
                arms.get(armFromSeq)!.push(c);
                assigned = true;
            }
        }

        // Heuristic 3: round-robin fallback (even distribution)
        if (!assigned) {
            // Pick the arm with the fewest items so far
            let minArm = 0;
            let minCount = Infinity;
            for (let a = 0; a < verbs.length; a++) {
                const count = arms.get(a)!.length;
                if (count < minCount) { minCount = count; minArm = a; }
            }
            arms.get(minArm)!.push(c);
        }
    }

    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    // Center node — use first trunk or create a synthetic center
    const centerConcept = trunks[0];
    const centerId = centerConcept ? `node-center-${centerConcept.id}` : 'node-center-subject';
    nodes.push({
        id: centerId,
        conceptId: centerConcept?.id || '__center__',
        conceptName: centerConcept?.name || 'Subject',
        x: snap(cx),
        y: snap(cy),
        meta: { role: 'center' },
    });

    // Additional trunks placed near center
    for (let ti = 1; ti < trunks.length; ti++) {
        const angle = ((ti - 1) / Math.max(1, trunks.length - 1)) * Math.PI * 2;
        const dist = 80;
        nodes.push({
            id: `node-trunk-${trunks[ti].id}`,
            conceptId: trunks[ti].id,
            conceptName: trunks[ti].name,
            x: snap(cx + dist * Math.cos(angle)),
            y: snap(cy + dist * Math.sin(angle)),
            meta: { role: 'center', sequenceNumber: ti },
        });
    }

    // Lay out each arm
    const verbCount = verbs.length;
    for (let armIdx = 0; armIdx < verbCount; armIdx++) {
        const armConcepts = arms.get(armIdx) || [];
        const baseAngle = (armIdx / verbCount) * Math.PI * 2 - Math.PI / 2; // Start from top

        // Sort by order field if available, else by name
        armConcepts.sort((a, b) => {
            const orderA = a.order ?? 999;
            const orderB = b.order ?? 999;
            return orderA - orderB || a.name.localeCompare(b.name);
        });

        // Arm rail overlay
        const maxDist = BASE_RADIUS + (Math.max(1, armConcepts.length) * STEP_SPACING);
        const railEndX = cx + maxDist * Math.cos(baseAngle);
        const railEndY = cy + maxDist * Math.sin(baseAngle);
        overlays.push({
            type: 'arm-rail',
            pathData: `M ${snap(cx)} ${snap(cy)} L ${snap(railEndX)} ${snap(railEndY)}`,
            label: verbs[armIdx],
            color: `var(--map-proc-branch-border)`,
        });

        let prevNodeId = centerId;
        for (let stepIdx = 0; stepIdx < armConcepts.length; stepIdx++) {
            const c = armConcepts[stepIdx];
            const distance = BASE_RADIUS + stepIdx * STEP_SPACING * Math.pow(PHI, Math.min(stepIdx, 2) * 0.3);
            const jitter = ((Math.random() - 0.5) * JITTER_DEG * Math.PI) / 180;
            const x = cx + distance * Math.cos(baseAngle + jitter);
            const y = cy + distance * Math.sin(baseAngle + jitter);

            const nodeId = `node-proc-${armIdx}-${stepIdx}-${c.id}`;
            nodes.push({
                id: nodeId,
                conceptId: c.id,
                conceptName: c.name,
                x: snap(x),
                y: snap(y),
                meta: {
                    role: 'step',
                    armIndex: armIdx,
                    sequenceNumber: stepIdx + 1,
                    verbLabel: verbs[armIdx],
                },
            });

            // Sequential edge from previous step
            edges.push({
                id: `edge-proc-${armIdx}-${stepIdx}`,
                fromId: prevNodeId,
                toId: nodeId,
                style: 'arrow',
                label: stepIdx === 0 ? verbs[armIdx] : undefined,
            });
            prevNodeId = nodeId;
        }
    }

    return { nodes, edges, overlays, classification: 'procedural' };
}
