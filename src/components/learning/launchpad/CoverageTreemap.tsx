
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { COLORS } from '@/constants/theme-colors';
import type { TreePacket } from '@/lib/ai/content-analytics';

interface CoverageTreemapProps {
    data: TreePacket[];
}

// Use centralized theme colors
const TREEMAP_COLORS = {
    strong: { fill: COLORS.secondary.sage, stroke: COLORS.secondary.sageDark || '#059669' },
    medium: { fill: COLORS.info, stroke: '#2563EB' },             // Blue-600
    weak: { fill: COLORS.secondary.amber, stroke: '#D97706' },    // Amber-600
};

const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, name, size } = props;

    // Softer, more trustworthy color scheme
    // Based on content density: higher = healthier (green), lower = needs attention (amber)
    const getStyle = (val: number) => {
        if (val >= 600) return { ...TREEMAP_COLORS.strong, opacity: 0.7 };
        if (val >= 300) return { ...TREEMAP_COLORS.medium, opacity: 0.6 };
        return { ...TREEMAP_COLORS.weak, opacity: 0.65 };
    };

    const style = depth === 1 ? getStyle(size) : { fill: 'none', opacity: 0, stroke: 'none' };

    // Text colors that work on the colored backgrounds
    const textColor = '#ffffff';
    const subTextColor = 'rgba(255, 255, 255, 0.85)';

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
                        fontSize={12}
                        fontWeight={600}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    >
                        {name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 16}
                        textAnchor="middle"
                        fill={subTextColor}
                        fontSize={10}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                        {(size / 100).toFixed(0)} Concepts
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
            style={{ width: '100%', height: '100%', minHeight: '300px' }}
        >
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
        </motion.div>
    );
};
