/**
 * Procedural Layout Engine — Multi-Domain Sweeping Arms
 *
 * Each trunk/domain gets its own hub, and each hub fans out verb arms
 * independently. This mirrors hand-drawn procedural diagrams where
 * each exam domain is a self-contained cluster of concept steps.
 *
 * Layout strategy:
 *  1. Group concepts by their trunk domain.
 *  2. Arrange domain hubs in a horizontal row (or grid for 3+).
 *  3. Each hub fans its own verb arms using cubic bezier curves,
 *     rotated so adjacent domains don't overlap.
 *
 * Uses a fixed virtual canvas — viewport zoom/pan fits to screen.
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const SNAP = 10;

const ARM_COLORS = [
    'var(--map-proc-arm-0)',
    'var(--map-proc-arm-1)',
    'var(--map-proc-arm-2)',
    'var(--map-proc-arm-3)',
    'var(--map-proc-arm-4)',
];

/**
 * Per-arm sweep definitions. Each domain's arms cycle through these.
 * startDeg = initial bearing from hub (0°=right, 90°=down, 180°=left, 270°=up).
 * sweepDeg = how far the bezier bends (positive=CCW, negative=CW).
 */
const ARM_TRAJECTORIES = [
    { startDeg: 200, sweepDeg: 120 },
    { startDeg: 310, sweepDeg: -100 },
    { startDeg: 30, sweepDeg: -70 },
    { startDeg: 140, sweepDeg: 90 },
    { startDeg: 260, sweepDeg: -80 },
];

function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
}

function deg2rad(d: number): number {
    return (d * Math.PI) / 180;
}

function cubicBezier(
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    t: number,
): [number, number] {
    const u = 1 - t;
    const uu = u * u;
    const uuu = uu * u;
    const tt = t * t;
    const ttt = tt * t;
    return [
        uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
        uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
    ];
}

function bezierPathSVG(
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
): string {
    return `M ${snap(p0[0])} ${snap(p0[1])} C ${snap(p1[0])} ${snap(p1[1])}, ${snap(p2[0])} ${snap(p2[1])}, ${snap(p3[0])} ${snap(p3[1])}`;
}

function matchConceptToArm(
    c: LearningConcept,
    verbs: string[],
    sequenceLookup: Map<string, number>,
): number {
    const verbsLower = verbs.map(v => v.toLowerCase());

    // Priority 1: Explicit primaryLifecycleVerb field (set by generation prompt)
    if ((c as Record<string, unknown>).primaryLifecycleVerb) {
        const plv = String((c as Record<string, unknown>).primaryLifecycleVerb).toLowerCase();
        const idx = verbsLower.indexOf(plv);
        if (idx >= 0) return idx;
    }

    // Priority 2: Concept name starts with or contains a verb keyword
    // e.g., "Create Resource Group" → matches CREATE arm
    const nameLower = c.name.toLowerCase();
    for (let vi = 0; vi < verbsLower.length; vi++) {
        const vl = verbsLower[vi];
        // Check starts-with, or contains " verb " / "(verb)" patterns
        if (nameLower.startsWith(vl + ' ') || nameLower.startsWith(vl + ':')) {
            return vi;
        }
    }
    // Weaker: name contains verb anywhere (but avoid false positives on short verbs)
    for (let vi = 0; vi < verbsLower.length; vi++) {
        const vl = verbsLower[vi];
        if (vl.length >= 4 && nameLower.includes(vl)) {
            return vi;
        }
    }

    // Priority 3: blueprintSteps[0].verb is the PRIMARY verb (prompt instructs AI to order primary first)
    if (c.blueprintSteps?.length) {
        const primaryVerb = c.blueprintSteps[0]?.verb?.toLowerCase();
        if (primaryVerb) {
            const idx = verbsLower.indexOf(primaryVerb);
            if (idx >= 0) return idx;
        }
    }

    // Priority 4: lifecyclePhase → arm index mapping
    // lifecyclePhase values (PREPARE/MODEL/DELIVER) map to phase1/phase2/phase3 arm indices
    if (c.lifecyclePhase) {
        const phaseMap: Record<string, number> = { 'PREPARE': 0, 'MODEL': 1, 'DELIVER': 2 };
        const armIdx = phaseMap[c.lifecyclePhase];
        if (armIdx !== undefined && armIdx < verbs.length) return armIdx;
    }

    // Priority 5: Sequence lookup from lifecycle blueprint sequences
    const idx = sequenceLookup.get(nameLower);
    if (idx !== undefined && idx < verbs.length) {
        return idx;
    }

    return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain grouping: cluster concepts under their trunk
// ─────────────────────────────────────────────────────────────────────────────

interface DomainCluster {
    trunk: LearningConcept;
    children: LearningConcept[];
}

function buildDomainClusters(concepts: LearningConcept[]): DomainCluster[] {
    const trunks = concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk');
    const nonTrunks = concepts.filter(c => (c.tier || '').toLowerCase() !== 'trunk');

    if (trunks.length === 0) {
        // No trunks — synthesize one virtual hub for everything
        return [{
            trunk: { id: '__virtual_trunk__', name: 'Subject', tier: 'trunk' } as LearningConcept,
            children: nonTrunks,
        }];
    }

    if (trunks.length === 1) {
        return [{ trunk: trunks[0], children: nonTrunks }];
    }

    // Multiple trunks — assign children by trunkDomain, parentName, or stageId
    const clusters: DomainCluster[] = trunks.map(t => ({ trunk: t, children: [] }));
    const orphans: LearningConcept[] = [];

    for (const c of nonTrunks) {
        let matched = false;
        for (const cl of clusters) {
            const td = (c.trunkDomain || '').toLowerCase();
            const pn = (c.parentName || '').toLowerCase();
            const tn = cl.trunk.name.toLowerCase();
            const tid = cl.trunk.id;
            if (td === tn || pn === tn || c.parentId === tid || c.stageId === tid) {
                cl.children.push(c);
                matched = true;
                break;
            }
        }
        if (!matched) orphans.push(c);
    }

    // Round-robin orphans into clusters with fewest children
    for (const c of orphans) {
        let minIdx = 0;
        for (let i = 1; i < clusters.length; i++) {
            if (clusters[i].children.length < clusters[minIdx].children.length) minIdx = i;
        }
        clusters[minIdx].children.push(c);
    }

    return clusters;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub placement — arrange domain hubs so they don't overlap
// ─────────────────────────────────────────────────────────────────────────────

function computeHubPositions(count: number, canvasW: number, canvasH: number): [number, number][] {
    if (count === 1) {
        return [[canvasW * 0.55, canvasH * 0.55]];
    }
    if (count === 2) {
        return [
            [canvasW * 0.28, canvasH * 0.62],
            [canvasW * 0.72, canvasH * 0.62],
        ];
    }
    if (count === 3) {
        return [
            [canvasW * 0.20, canvasH * 0.65],
            [canvasW * 0.50, canvasH * 0.65],
            [canvasW * 0.80, canvasH * 0.65],
        ];
    }
    // 4+ domains: 2-row grid
    const cols = Math.ceil(count / 2);
    const positions: [number, number][] = [];
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = canvasW * (0.2 + (col / Math.max(1, cols - 1)) * 0.6);
        const y = canvasH * (row === 0 ? 0.40 : 0.75);
        positions.push([x, y]);
    }
    return positions;
}

/**
 * Rotate arm trajectories per domain so adjacent clusters point
 * in different directions and don't overlap visually.
 */
function rotatedTrajectory(baseIdx: number, domainIdx: number, totalDomains: number) {
    const base = ARM_TRAJECTORIES[baseIdx % ARM_TRAJECTORIES.length];
    // Spread domains evenly: each domain's arms are rotated by an offset
    const offsetDeg = totalDomains > 1
        ? (domainIdx / totalDomains) * 120 - 60
        : 0;
    return {
        startDeg: base.startDeg + offsetDeg,
        sweepDeg: base.sweepDeg,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main layout
// ─────────────────────────────────────────────────────────────────────────────

export function proceduralLayout(
    concepts: LearningConcept[],
    _canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    // ── Extract verbs ──────────────────────────────────────────────────────
    const verbs: string[] = [];
    const FALLBACK_VERBS = ['EXPLORE', 'BUILD', 'REVIEW'];
    if (lifecycleBlueprints?.phase1) verbs.push(lifecycleBlueprints.phase1.verb);
    if (lifecycleBlueprints?.phase2) verbs.push(lifecycleBlueprints.phase2.verb);
    if (lifecycleBlueprints?.phase3) verbs.push(lifecycleBlueprints.phase3.verb);
    while (verbs.length < 3) {
        verbs.push(FALLBACK_VERBS[verbs.length] || `ARM ${verbs.length + 1}`);
    }

    // ── Sequence lookup from lifecycle blueprints ──────────────────────────
    const sequenceLookup = new Map<string, number>();
    const phases = [
        lifecycleBlueprints?.phase1,
        lifecycleBlueprints?.phase2,
        lifecycleBlueprints?.phase3,
    ];
    for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        if (phase?.sequence) {
            for (const seqItem of phase.sequence) {
                sequenceLookup.set(seqItem.toLowerCase(), pi);
            }
        }
    }

    // ── Build domain clusters ──────────────────────────────────────────────
    const clusters = buildDomainClusters(concepts);
    const domainCount = clusters.length;

    // Canvas scales with domain count so arms have room
    const CANVAS_W = 2400 + domainCount * 800;
    const CANVAS_H = 2400 + domainCount * 400;
    const hubPositions = computeHubPositions(domainCount, CANVAS_W, CANVAS_H);

    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    // ── Lay out each domain cluster independently ─────────────────────────
    for (let di = 0; di < domainCount; di++) {
        const cluster = clusters[di];
        const [hubX, hubY] = hubPositions[di];
        const trunk = cluster.trunk;

        // Hub node
        const hubId = `node-hub-${di}-${trunk.id}`;
        nodes.push({
            id: hubId,
            conceptId: trunk.id,
            conceptName: trunk.name,
            x: snap(hubX),
            y: snap(hubY),
            meta: { role: 'center' },
        });

        // ── Distribute this domain's children into verb arms ──────────
        const arms: LearningConcept[][] = verbs.map(() => []);
        const unmatched: LearningConcept[] = [];

        for (const c of cluster.children) {
            const armIdx = matchConceptToArm(c, verbs, sequenceLookup);
            if (armIdx >= 0) {
                arms[armIdx].push(c);
            } else {
                unmatched.push(c);
            }
        }

        for (const c of unmatched) {
            let minIdx = 0;
            for (let a = 1; a < arms.length; a++) {
                if (arms[a].length < arms[minIdx].length) minIdx = a;
            }
            arms[minIdx].push(c);
        }

        for (const arm of arms) {
            arm.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        }

        // ── Build arms from this hub ──────────────────────────────────
        for (let ai = 0; ai < verbs.length; ai++) {
            const armConcepts = arms[ai];
            if (armConcepts.length === 0) continue;

            const armColor = ARM_COLORS[ai % ARM_COLORS.length];
            const traj = rotatedTrajectory(ai, di, domainCount);

            const stepCount = armConcepts.length;
            const armLength = 900 + stepCount * 220;

            const startRad = deg2rad(traj.startDeg);
            const endRad = deg2rad(traj.startDeg + traj.sweepDeg);

            const p0: [number, number] = [hubX, hubY];
            const p3: [number, number] = [
                hubX + armLength * Math.cos(endRad),
                hubY + armLength * Math.sin(endRad),
            ];
            const p1: [number, number] = [
                hubX + (armLength * 0.35) * Math.cos(startRad),
                hubY + (armLength * 0.35) * Math.sin(startRad),
            ];
            const p2: [number, number] = [
                hubX + (armLength * 0.7) * Math.cos(endRad),
                hubY + (armLength * 0.7) * Math.sin(endRad),
            ];

            // Arm rail overlay
            overlays.push({
                type: 'arm-rail',
                pathData: bezierPathSVG(p0, p1, p2, p3),
                label: verbs[ai],
                color: armColor,
            });

            // Verb label node near start of curve
            const [vx, vy] = cubicBezier(p0, p1, p2, p3, 0.12);
            const verbNodeId = `node-verb-${di}-${ai}`;
            nodes.push({
                id: verbNodeId,
                conceptId: `__verb_${di}_${ai}__`,
                conceptName: verbs[ai],
                x: snap(vx),
                y: snap(vy),
                meta: {
                    role: 'verb',
                    armIndex: ai,
                    verbLabel: verbs[ai],
                    armColor,
                },
            });
            edges.push({
                id: `edge-verb-${di}-${ai}`,
                fromId: hubId,
                toId: verbNodeId,
                style: 'arrow',
                color: armColor,
            });

            // Step nodes along the curve
            const tStart = 0.18;
            const tEnd = 0.88;
            let prevNodeId = verbNodeId;
            for (let si = 0; si < armConcepts.length; si++) {
                const c = armConcepts[si];
                const t = stepCount === 1
                    ? 0.50
                    : tStart + (si / (stepCount - 1)) * (tEnd - tStart);
                const [px, py] = cubicBezier(p0, p1, p2, p3, t);

                const nodeId = `node-proc-${di}-${ai}-${si}-${c.id}`;
                nodes.push({
                    id: nodeId,
                    conceptId: c.id,
                    conceptName: c.name,
                    x: snap(px),
                    y: snap(py),
                    meta: {
                        role: 'step',
                        armIndex: ai,
                        sequenceNumber: si + 1,
                        verbLabel: verbs[ai],
                        armColor,
                    },
                });

                edges.push({
                    id: `edge-proc-${di}-${ai}-${si}`,
                    fromId: prevNodeId,
                    toId: nodeId,
                    style: 'arrow',
                    label: si === 0 ? verbs[ai] : undefined,
                    color: armColor,
                });
                prevNodeId = nodeId;
            }
        }
    }

    return { nodes, edges, overlays, classification: 'procedural' };
}
