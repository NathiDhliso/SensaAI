/**
 * Conceptual Layout Engine
 * 
 * Orbital rings topology — principle at center, lens categories
 * in an inner ring, application scenarios in an outer ring.
 * No directional flow — conceptual subjects are lens-based.
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const INNER_RADIUS = 200;
const OUTER_RADIUS = 380;
const SNAP = 20;

function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
}

export function conceptualLayout(
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;

    // Extract lens labels from lifecycle blueprints
    const lensLabels: string[] = [];
    if (lifecycleBlueprints?.phase1) lensLabels.push(lifecycleBlueprints.phase1.verb);
    if (lifecycleBlueprints?.phase2) lensLabels.push(lifecycleBlueprints.phase2.verb);
    if (lifecycleBlueprints?.phase3) lensLabels.push(lifecycleBlueprints.phase3.verb);
    if (lensLabels.length === 0) lensLabels.push('IDENTIFY', 'APPLY', 'ASSESS');

    // Separate trunks (center), branches (lenses/ring1), leaves (scenarios/ring2)
    const trunks = concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk');
    const branches = concepts.filter(c => (c.tier || '').toLowerCase() === 'branch');
    const leaves = concepts.filter(c => {
        const t = (c.tier || '').toLowerCase();
        return t !== 'trunk' && t !== 'branch';
    });

    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    // Center node
    const centerConcept = trunks[0];
    const centerId = centerConcept ? `node-conc-center-${centerConcept.id}` : 'node-conc-center';
    nodes.push({
        id: centerId,
        conceptId: centerConcept?.id || '__center__',
        conceptName: centerConcept?.name || 'Core Principle',
        x: snap(cx),
        y: snap(cy),
        meta: { role: 'center' },
    });

    // Additional trunks close to center
    for (let ti = 1; ti < trunks.length; ti++) {
        const angle = ((ti - 1) / Math.max(1, trunks.length - 1)) * Math.PI * 2;
        nodes.push({
            id: `node-conc-trunk-${trunks[ti].id}`,
            conceptId: trunks[ti].id,
            conceptName: trunks[ti].name,
            x: snap(cx + 70 * Math.cos(angle)),
            y: snap(cy + 70 * Math.sin(angle)),
            meta: { role: 'center', sequenceNumber: ti },
        });
    }

    // Ring 1: Lenses / Branches
    const lensNodes: PositionedNode[] = [];
    const useBranches = branches.length > 0 ? branches : leaves.slice(0, Math.min(4, leaves.length));
    const ring1Items = branches.length > 0 ? branches : useBranches;
    const ring1Remaining = branches.length > 0 ? leaves : leaves.slice(Math.min(4, leaves.length));

    for (let i = 0; i < ring1Items.length; i++) {
        const c = ring1Items[i];
        const angle = (i / ring1Items.length) * Math.PI * 2 - Math.PI / 2;
        const nodeId = `node-conc-lens-${c.id}`;
        const node: PositionedNode = {
            id: nodeId,
            conceptId: c.id,
            conceptName: c.name,
            x: snap(cx + INNER_RADIUS * Math.cos(angle)),
            y: snap(cy + INNER_RADIUS * Math.sin(angle)),
            meta: {
                role: 'lens',
                ringIndex: 0,
                sequenceNumber: i,
                verbLabel: lensLabels[i % lensLabels.length],
            },
        };
        nodes.push(node);
        lensNodes.push(node);

        // Edge from center to lens (no arrows — conceptual is undirected)
        edges.push({
            id: `edge-conc-center-${i}`,
            fromId: centerId,
            toId: nodeId,
            style: 'solid',
        });
    }

    // Ring 2: Scenarios / Leaves — cluster near parent lens
    for (let i = 0; i < ring1Remaining.length; i++) {
        const c = ring1Remaining[i];
        // Find parent lens by parentName or trunkDomain
        let parentLensIdx = 0;
        if (c.parentName) {
            const found = lensNodes.findIndex(ln => ln.conceptName === c.parentName);
            if (found >= 0) parentLensIdx = found;
        } else if (c.trunkDomain) {
            const found = lensNodes.findIndex(ln => ln.conceptName === c.trunkDomain);
            if (found >= 0) parentLensIdx = found;
        } else {
            parentLensIdx = i % lensNodes.length;
        }

        const parentAngle = (parentLensIdx / Math.max(1, lensNodes.length)) * Math.PI * 2 - Math.PI / 2;
        const spreadArc = 0.25; // radians
        const childrenOfParent = ring1Remaining.filter(r => {
            if (r.parentName) return lensNodes[parentLensIdx]?.conceptName === r.parentName;
            if (r.trunkDomain) return lensNodes[parentLensIdx]?.conceptName === r.trunkDomain;
            return false;
        });
        const childIdx = childrenOfParent.indexOf(c);
        const midpoint = (childrenOfParent.length - 1) / 2;
        const offset = childIdx >= 0 ? (childIdx - midpoint) * spreadArc : (i % 3 - 1) * spreadArc;
        const scenarioAngle = parentAngle + offset;

        const nodeId = `node-conc-scenario-${c.id}`;
        nodes.push({
            id: nodeId,
            conceptId: c.id,
            conceptName: c.name,
            x: snap(cx + OUTER_RADIUS * Math.cos(scenarioAngle)),
            y: snap(cy + OUTER_RADIUS * Math.sin(scenarioAngle)),
            meta: {
                role: 'scenario',
                ringIndex: 1,
                sequenceNumber: i,
            },
        });

        // Dashed edge from parent lens
        if (lensNodes[parentLensIdx]) {
            edges.push({
                id: `edge-conc-scenario-${i}`,
                fromId: lensNodes[parentLensIdx].id,
                toId: nodeId,
                style: 'dashed',
            });
        }
    }

    // Orbital ring overlays
    overlays.push({
        type: 'orbital-ring',
        cx, cy,
        radius: INNER_RADIUS,
        label: 'Lenses',
        color: 'var(--map-conc-line-light)',
    });
    overlays.push({
        type: 'orbital-ring',
        cx, cy,
        radius: OUTER_RADIUS,
        label: 'Applications',
        color: 'var(--map-conc-line-light)',
    });

    // Cross-lens arcs (connect adjacent lenses with dotted lines)
    for (let i = 0; i < lensNodes.length; i++) {
        const next = (i + 1) % lensNodes.length;
        if (lensNodes.length > 1) {
            edges.push({
                id: `edge-conc-crosslens-${i}`,
                fromId: lensNodes[i].id,
                toId: lensNodes[next].id,
                style: 'dashed',
            });
        }
    }

    return { nodes, edges, overlays, classification: 'conceptual' };
}
