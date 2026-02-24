/**
 * Perceptual Layout Engine
 *
 * Top-down branching tree topology — a root judgment at the top,
 * branching into observation forks that split into refinement leaves.
 * Emphasises the tree-like decision structure of perceptual subjects
 * (radiology, music, art critique, wine tasting).
 */
import type { LearningConcept } from '@/shared/types/learning';
import type {
    LayoutResult,
    PositionedNode,
    LayoutEdge,
    LayoutOverlay,
    LifecycleBlueprints,
} from './types';

const TIER_HEIGHT = 180;
const MIN_BRANCH_WIDTH = 160;
const SNAP = 20;

function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
}

interface TreeNode {
    concept: LearningConcept;
    children: TreeNode[];
}

function buildTree(concepts: LearningConcept[]): TreeNode[] {
    const byName = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create tree nodes for each concept
    for (const c of concepts) {
        byName.set(c.name, { concept: c, children: [] });
    }

    // Link children to parents
    for (const c of concepts) {
        const treeNode = byName.get(c.name)!;
        const parentName = c.parentName || c.trunkDomain;
        if (parentName && byName.has(parentName)) {
            byName.get(parentName)!.children.push(treeNode);
        } else {
            roots.push(treeNode);
        }
    }

    // If we end up with no roots, treat trunks as roots
    if (roots.length === 0) {
        for (const c of concepts.filter(co => (co.tier || '').toLowerCase() === 'trunk')) {
            const treeNode = byName.get(c.name);
            if (treeNode) roots.push(treeNode);
        }
    }

    // If still no roots, take first concept
    if (roots.length === 0 && concepts.length > 0) {
        roots.push(byName.get(concepts[0].name)!);
        // Assign unlinked children round-robin
        const unlinked = concepts.slice(1).filter(c => {
            const pn = c.parentName || c.trunkDomain;
            return !pn || !byName.has(pn);
        });
        for (const ul of unlinked) {
            roots[0].children.push(byName.get(ul.name)!);
        }
    }

    return roots;
}

function countLeaves(node: TreeNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, ch) => sum + countLeaves(ch), 0);
}

function layoutSubtree(
    tree: TreeNode,
    depth: number,
    leftX: number,
    cx: number,
    nodes: PositionedNode[],
    edges: LayoutEdge[],
    startY: number,
): { width: number; nodeId: string } {
    const leafCount = countLeaves(tree);
    const subtreeWidth = Math.max(leafCount * MIN_BRANCH_WIDTH, MIN_BRANCH_WIDTH);
    const y = startY + depth * TIER_HEIGHT;

    const isTrunk = (tree.concept.tier || '').toLowerCase() === 'trunk';
    const isBranch = (tree.concept.tier || '').toLowerCase() === 'branch';
    const role = depth === 0 ? 'root' : isTrunk ? 'root' : isBranch ? 'fork' : 'step';

    const nodeId = `node-perc-${role}-${tree.concept.id}`;
    const nodeX = snap(leftX + subtreeWidth / 2);

    nodes.push({
        id: nodeId,
        conceptId: tree.concept.id,
        conceptName: tree.concept.name,
        x: nodeX,
        y: snap(y),
        meta: {
            role: role as 'root' | 'fork' | 'step',
            sequenceNumber: depth,
        },
    });

    if (tree.children.length === 0) {
        return { width: subtreeWidth, nodeId };
    }

    // Layout children across the subtree width
    let childX = leftX;
    const childResults: { nodeId: string; width: number }[] = [];

    for (const child of tree.children) {
        const childLeaves = countLeaves(child);
        const childWidth = Math.max(childLeaves * MIN_BRANCH_WIDTH, MIN_BRANCH_WIDTH);
        const result = layoutSubtree(child, depth + 1, childX, cx, nodes, edges, startY);
        childResults.push(result);

        // Edge from parent to child
        edges.push({
            id: `edge-perc-${nodeId}-${result.nodeId}`,
            fromId: nodeId,
            toId: result.nodeId,
            style: 'solid',
            markers: ['forward-arrow'],
        });

        childX += childWidth;
    }

    // If this is a fork point (branches into 2+), add fork marker edge label
    if (tree.children.length >= 2 && isBranch) {
        const lastEdge = edges[edges.length - 1];
        if (lastEdge) lastEdge.markers = ['fork-diamond', 'forward-arrow'];
    }

    return { width: subtreeWidth, nodeId };
}

export function perceptualLayout(
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    const cx = canvasSize.width / 2;
    const startY = 80;

    const nodes: PositionedNode[] = [];
    const edges: LayoutEdge[] = [];
    const overlays: LayoutOverlay[] = [];

    const trees = buildTree(concepts);

    // If single root, centre it; if multiple roots, lay them across
    const totalLeaves = trees.reduce((sum, t) => sum + countLeaves(t), 0);
    const totalWidth = Math.max(totalLeaves * MIN_BRANCH_WIDTH, canvasSize.width * 0.6);
    const offsetX = cx - totalWidth / 2;

    let curX = offsetX;
    for (const tree of trees) {
        const treeLeaves = countLeaves(tree);
        const treeWidth = Math.max(treeLeaves * MIN_BRANCH_WIDTH, MIN_BRANCH_WIDTH);
        layoutSubtree(tree, 0, curX, cx, nodes, edges, startY);
        curX += treeWidth;
    }

    // Branch-label nodes for lifecycle verbs if we have blueprints
    const verbLabels: string[] = [];
    if (lifecycleBlueprints?.phase1) verbLabels.push(lifecycleBlueprints.phase1.verb);
    if (lifecycleBlueprints?.phase2) verbLabels.push(lifecycleBlueprints.phase2.verb);
    if (lifecycleBlueprints?.phase3) verbLabels.push(lifecycleBlueprints.phase3.verb);

    if (verbLabels.length > 0) {
        const uniqueDepths = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b);
        for (let i = 0; i < Math.min(verbLabels.length, uniqueDepths.length); i++) {
            overlays.push({
                type: 'tier-label',
                y: uniqueDepths[i],
                label: verbLabels[i],
                color: 'var(--map-perc-line-light)',
            });
        }
    }

    // Depth-band overlays for each tier
    const uniqueYs = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b);
    for (let i = 0; i < uniqueYs.length; i++) {
        overlays.push({
            type: 'depth-band',
            y: uniqueYs[i] - 40,
            height: TIER_HEIGHT - 20,
            label: i === 0 ? 'Root Judgment' : i === 1 ? 'Observation Forks' : `Refinement ${i - 1}`,
            color: `var(--map-perc-ring-${Math.min(i, 2)})`,
        });
    }

    return { nodes, edges, overlays, classification: 'perceptual' };
}
