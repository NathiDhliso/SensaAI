
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { COLORS, GRAPH_COLORS } from '@/constants/theme-colors';
import type { TreePacket } from '@/lib/ai/content-analytics';

interface CoverageTreemapProps {
    data: TreePacket[];
}

interface CustomizedContentProps {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    size?: number;
    tier?: string;
    [key: string]: unknown;
}

const CustomizedContent = (props: CustomizedContentProps) => {
    const { depth, x, y, width, height, name, size, tier } = props;

    // Semantic color scheme based on Tier/Category name
    const getStyle = (categoryName: string) => {
        const lowerName = (categoryName || '').toLowerCase();

        if (lowerName.includes('foundation') || lowerName.includes('basics') || lowerName.includes('preparation')) {
            return { fill: GRAPH_COLORS.foundation, stroke: COLORS.secondary.sage, opacity: 0.9 };
        }
        if (lowerName.includes('keystone') || lowerName.includes('structuring') || lowerName.includes('modeling')) {
            return { fill: GRAPH_COLORS.keystone, stroke: COLORS.accent.default, opacity: 0.9 };
        }
        if (lowerName.includes('utility') || lowerName.includes('advanced') || lowerName.includes('delivery')) {
            return { fill: GRAPH_COLORS.utility, stroke: COLORS.secondary.amber, opacity: 0.9 };
        }

        // Fallback
        return { fill: COLORS.text.muted, stroke: COLORS.text.light, opacity: 0.7 };
    };

    // Determine style based on Tier (leaf) or Name (group)
    const category = tier || name;
    const isLeaf = depth === 2 || (depth === 1 && !props.children);
    const style = isLeaf ? getStyle(category) : { fill: 'none', opacity: 0, stroke: 'none' };

    // Text colors - using white for visibility on colored backgrounds
    const textColor = COLORS.white;
    const subTextColor = COLORS.white;

    // Only render if it's a leaf node to avoid group overlaps
    if (!isLeaf) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={style.fill}
                fillOpacity={style.opacity}
                stroke={COLORS.white}
                strokeWidth={2} // Strong border to separate tiles
                rx={6}
                ry={6}
            />
            {(size ?? 0) > 0 && (height > 35 ? (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 6}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={Math.min(11, width / 12)}
                        fontWeight={600}
                        style={{ pointerEvents: 'none', textShadow: 'var(--shadow-sm)' }}
                    >
                        {name.length > 20 ? name.substring(0, 18) + '...' : name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 8}
                        textAnchor="middle"
                        fill={subTextColor}
                        fontSize={9}
                        style={{ pointerEvents: 'none' }}
                    >
                        {Math.round((size ?? 0) / 100)} pts
                    </text>
                </>
            ) : null)}
        </g>
    );
};

export const CoverageTreemap: React.FC<CoverageTreemapProps> = ({ data }) => {
    if (!data || data.length === 0) return <div>No map data</div>;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '200px',
                minWidth: '200px',
            }}
        >
            <div style={{ width: '100%', height: 'calc(100% - 20px)', minHeight: '300px', flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={200}>
                    <Treemap
                        data={data}
                        dataKey="size"
                        stroke="transparent"
                        fill={COLORS.accent.light}
                        content={(props) => <CustomizedContent {...(props as CustomizedContentProps)} />}
                    >
                        <Tooltip
                            contentStyle={{
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-md)',
                                padding: '0.75rem 1rem',
                            }}
                            itemStyle={{ color: COLORS.text.medium, fontSize: '0.875rem' }}
                            labelStyle={{ color: COLORS.text.dark, fontWeight: 600, marginBottom: '0.25rem' }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
