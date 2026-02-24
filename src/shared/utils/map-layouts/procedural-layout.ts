/**
 * Procedural Layout Engine — Sweeping Arm Topology
 *
 * Each verb arm sweeps outward from a center diamond along a dramatic
 * cubic bezier curve. Arms fan out at equal angular intervals and each
 * arm curves ~55° counter-clockwise, producing visually distinct
 * color-coded branches with prominent verb labels.
 *
 * Uses a fixed virtual canvas (VIRTUAL_SIZE) so the layout is always
 * well-proportioned — the viewport zoom/pan handles fitting to screen.
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const VIRTUAL_SIZE = 2400;
const CENTER = VIRTUAL_SIZE / 2;
const SNAP = 10;

const VERB_NODE_DIST = 200;
const FIRST_STEP_DIST = 360;
const STEP_GAP = 170;

const SWEEP_DEG = 50;

const ARM_COLORS = [
    'var(--map-proc-arm-0)',
    'var(--map-proc-arm-1)',
    'var(--map-proc-arm-2)',
    'var(--map-proc-arm-3)',
    'var(--map-proc-arm-4)',
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

function bezierPath(
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    segments = 30,
): string {
    const parts = [`M ${snap(p0[0])} ${snap(p0[1])}`];
    for (let i = 1; i <= segments; i++) {
        const [x, y] = cubicBezier(p0, p1, p2, p3, i / segments);
        parts.push(`L ${snap(x)} ${snap(y)}`);
    }
    return parts.join(' ');
}

/**
 * Best-effort assignment of a concept to an arm index.
 * Returns -1 if no heuristic matches.
 */
function matchConceptToArm(
    c: LearningConcept,
    verbs: string[],
    sequenceLookup: Map<string, number>,
): number {
    // Heuristic 1: blueprintSteps verb match
    if (c.blueprintSteps?.length) {
        for (let vi = 0; vi < verbs.length; vi++) {
            const vLower = verbs[vi].toLowerCase();
            if (c.blueprintSteps.some((bs: { verb?: string }) => bs.verb?.toLowerCase() === vLower)) {
                return vi;
            }
        }
    }

    // Heuristic 2: sequence lookup from lifecycle blueprints
    const idx = sequenceLookup.get(c.name.toLowerCase());
    if (idx !== undefined && idx < verbs.length) {
        return idx;
    }

    return -1;
}

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

    if (typeof window !== 'undefined') {
        console.log('[ProceduralLayout] verbs:', verbs,
            '| concepts:', concepts.length,
            '| blueprints:', lifecycleBlueprints ? 'yes' : 'no');
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

    // ── Separate trunks / non-trunks ───────────────────────────────────────
    const trunks = concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk');
    const nonTrunks = concepts.filter(c => (c.tier || '').toLowerCase() !== 'trunk');

    // ── Distribute concepts into arms ──────────────────────────────────────
    // Two-pass: first assign matched concepts, then round-robin the rest
    const arms: LearningConcept[][] = verbs.map(() => []);
    const unmatched: LearningConcept[] = [];

    for (const c of nonTrunks) {
        const armIdx = matchConceptToArm(c, verbs, sequenceLookup);
        if (armIdx >= 0) {
            arms[armIdx].push(c);
        } else {
            unmatched.push(c);
        }
    }

    // Round-robin unmatched into the arms with fewest items
    for (const c of unmatched) {
        let minIdx = 0;
        for (let a = 1; a < arms.length; a++) {
            if (arms[a].length < arms[minIdx].length) minIdx = a;
        }
        arms[minIdx].push(c);
    }

    if (typeof window !== 'undefined') {
        console.log('[ProceduralLayout] arm distribution:',
            arms.map((a, i) => `${verbs[i]}(${a.length}): [${a.map(c => c.name).join(', ')}]`));
    }

    // Sort each arm by order then name
    for (const arm of arms) {
        arm.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
    }

    // ── Output arrays ──────────────────────────────────────────────────────
    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    // ── Center node ────────────────────────────────────────────────────────
    const centerConcept = trunks[0];
    const centerId = centerConcept
        ? `node-center-${centerConcept.id}`
        : 'node-center-subject';

    nodes.push({
        id: centerId,
        conceptId: centerConcept?.id || '__center__',
        conceptName: centerConcept?.name || 'Subject',
        x: snap(CENTER),
        y: snap(CENTER),
        meta: { role: 'center' },
    });

    // Extra trunks near center
    for (let ti = 1; ti < trunks.length; ti++) {
        const a = ((ti - 1) / Math.max(1, trunks.length - 1)) * Math.PI * 2;
        nodes.push({
            id: `node-trunk-${trunks[ti].id}`,
            conceptId: trunks[ti].id,
            conceptName: trunks[ti].name,
            x: snap(CENTER + 100 * Math.cos(a)),
            y: snap(CENTER + 100 * Math.sin(a)),
            meta: { role: 'center', sequenceNumber: ti },
        });
    }

    // ── Build each arm ─────────────────────────────────────────────────────
    const sweepRad = deg2rad(SWEEP_DEG);
    const verbCount = verbs.length;

    for (let ai = 0; ai < verbCount; ai++) {
        const armConcepts = arms[ai];
        const armColor = ARM_COLORS[ai % ARM_COLORS.length];

        const startAngle = (ai / verbCount) * Math.PI * 2 - Math.PI / 2;
        const endAngle = startAngle + sweepRad;

        const stepCount = Math.max(armConcepts.length, 1);
        const armLength = FIRST_STEP_DIST + (stepCount - 1) * STEP_GAP + 120;

        // Cubic bezier control points for the sweeping curve
        const p0: [number, number] = [CENTER, CENTER];
        const p3: [number, number] = [
            CENTER + armLength * Math.cos(endAngle),
            CENTER + armLength * Math.sin(endAngle),
        ];
        const p1: [number, number] = [
            CENTER + (armLength * 0.38) * Math.cos(startAngle),
            CENTER + (armLength * 0.38) * Math.sin(startAngle),
        ];
        const p2: [number, number] = [
            CENTER + (armLength * 0.75) * Math.cos(endAngle),
            CENTER + (armLength * 0.75) * Math.sin(endAngle),
        ];

        // Arm rail overlay
        overlays.push({
            type: 'arm-rail',
            pathData: bezierPath(p0, p1, p2, p3),
            label: verbs[ai],
            color: armColor,
        });

        // ── Verb label node (placed on the curve near the start) ───────────
        const verbT = VERB_NODE_DIST / armLength;
        const [vx, vy] = cubicBezier(p0, p1, p2, p3, Math.min(verbT, 0.18));
        const verbNodeId = `node-verb-${ai}`;
        nodes.push({
            id: verbNodeId,
            conceptId: `__verb_${ai}__`,
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
            id: `edge-verb-${ai}`,
            fromId: centerId,
            toId: verbNodeId,
            style: 'arrow',
            color: armColor,
        });

        // ── Step nodes along the curve ─────────────────────────────────────
        let prevNodeId = verbNodeId;
        for (let si = 0; si < armConcepts.length; si++) {
            const c = armConcepts[si];
            const tMin = 0.25;
            const tMax = 0.92;
            const t = stepCount === 1
                ? 0.55
                : tMin + (si / (stepCount - 1)) * (tMax - tMin);
            const [px, py] = cubicBezier(p0, p1, p2, p3, t);

            const nodeId = `node-proc-${ai}-${si}-${c.id}`;
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
                id: `edge-proc-${ai}-${si}`,
                fromId: prevNodeId,
                toId: nodeId,
                style: 'arrow',
                label: si === 0 ? verbs[ai] : undefined,
                color: armColor,
            });
            prevNodeId = nodeId;
        }
    }

    if (typeof window !== 'undefined') {
        console.log('[ProceduralLayout] total nodes:', nodes.length,
            '| edges:', edges.length,
            '| overlays:', overlays.length);
        for (const n of nodes) {
            console.log(`  [${n.meta.role}] "${n.conceptName}" → (${n.x}, ${n.y}) arm=${n.meta.armIndex ?? '-'}`);
        }
    }

    return { nodes, edges, overlays, classification: 'procedural' };
}
