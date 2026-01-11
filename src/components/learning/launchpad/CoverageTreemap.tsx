
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { COLORS, GRAPH_COLORS } from '@/constants/theme-colors';
import type { TreePacket } from '@/lib/ai/content-analytics';

interface CoverageTreemapProps {
    data: TreePacket[];
}

const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, name, size } = props;

    // Semantic color scheme based on Tier/Category name
    const getStyle = (categoryName: string) => {
        const lowerName = categoryName.toLowerCase();

        if (lowerName.includes('foundation') || lowerName.includes('basics') || lowerName.includes('preparation')) {
            return { fill: GRAPH_COLORS.foundation, stroke: COLORS.secondary.sage, opacity: 0.8 };
        }
        if (lowerName.includes('keystone') || lowerName.includes('structuring') || lowerName.includes('modeling')) {
            return { fill: GRAPH_COLORS.keystone, stroke: COLORS.accent.default, opacity: 0.8 };
        }
        if (lowerName.includes('utility') || lowerName.includes('advanced') || lowerName.includes('delivery')) {
            return { fill: GRAPH_COLORS.utility, stroke: COLORS.secondary.amber, opacity: 0.8 };
        }

        // Fallback for "Other" or unknown categories
        return { fill: COLORS.text.muted, stroke: COLORS.text.light, opacity: 0.6 };
    };

    const style = depth === 1 ? getStyle(name) : { fill: 'none', opacity: 0, stroke: 'none' };

    // Text colors that work on the colored backgrounds
    const textColor = '#ffffff';
    const subTextColor = 'rgba(255, 255, 255, 0.85)';

    // Calculate concept count from size (size = conceptCount * 100)
    const conceptCount = Math.round(size / 100);

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={style.fill}
                fillOpacity={style.opacity}
                stroke={style.stroke}
                strokeWidth={1.5}
                strokeOpacity={0.5}
                rx={8}
                ry={8}
            />
            {depth === 1 && width > 50 && height > 30 ? (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={Math.min(12, width / 10)}
                        fontWeight={600}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    >
                        {name.length > 20 ? name.substring(0, 18) + '...' : name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 14}
                        textAnchor="middle"
                        fill={subTextColor}
                        fontSize={9}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                        {conceptCount} Concepts
                    </text>
                </>
            ) : null}
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
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="transparent"
                        fill="#8884d8"
                        content={<CustomizedContent />}
                    >
                        <Tooltip
                            contentStyle={{
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                padding: '0.75rem 1rem',
                            }}
                            itemStyle={{ color: '#374151', fontSize: '0.875rem' }}
                            labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '0.25rem' }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
