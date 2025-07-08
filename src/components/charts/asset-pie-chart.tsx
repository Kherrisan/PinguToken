"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface AssetData {
    name: string
    fullPath?: string
    value: number
    percentage: number
}

interface AssetPieChartProps {
    data: AssetData[]
    totalAssets: number
}

// 预定义的颜色数组
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c',
    '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
];

const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg">
                <p className="font-medium">{data.fullPath || data.name}</p>
                <p className="text-sm text-gray-600">
                    {new Intl.NumberFormat('zh-CN', {
                        style: 'currency',
                        currency: 'CNY'
                    }).format(data.value)}
                </p>
                <p className="text-sm text-gray-600">
                    占比: {data.percentage.toFixed(2)}%
                </p>
            </div>
        )
    }
    return null
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null // 小于5%的不显示标签
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
        <text 
            x={x} 
            y={y} 
            fill="white" 
            textAnchor={x > cx ? 'start' : 'end'} 
            dominantBaseline="central"
            fontSize="12"
            fontWeight="bold"
        >
            {`${percentage.toFixed(1)}%`}
        </text>
    )
}

export function AssetPieChart({ data, totalAssets }: AssetPieChartProps) {
    // 过滤掉0值和负值的数据
    const validData = data.filter(item => item.value > 0)
    
    // 如果没有有效数据，显示空状态
    if (validData.length === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
                暂无资产数据
            </div>
        )
    }

    return (
        <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={validData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={140}
                        innerRadius={0}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {validData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                            />
                        ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend 
                        verticalAlign="bottom" 
                        height={80}
                        wrapperStyle={{ 
                            paddingTop: '20px',
                            fontSize: '11px'
                        }}
                        formatter={(value) => (
                            <span style={{ fontSize: '11px' }}>
                                {value}
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
} 