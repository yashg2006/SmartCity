import { useEffect, useRef } from 'react'

function getNodeColor(node) {
    if (node.gasLevel > 2000 || node.waterStatus === 'OVERFLOW') return '#ff2d55'
    if (node.gasLevel > 1000 || node.distance > 75) return '#ffb800'
    return '#00ff88'
}

// SVG-based sensor map (no external map dependencies for offline mode)
export default function SensorMap({ nodes }) {
    const containerRef = useRef(null)

    // These represent a simplified city grid layout (not real geo)
    const mapNodes = nodes.map((n, i) => ({
        ...n,
        // Spread nodes in a grid-like pattern on a 400x320 canvas
        x: 60 + (i % 3) * 130 + (Math.floor(i / 3) * 30),
        y: 60 + Math.floor(i / 3) * 130 + (i % 2) * 20,
        color: getNodeColor(n),
    }))

    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            <div className="map-overlay-header">
                <span className="map-badge">📍 SENSOR NETWORK MAP</span>
                <span className="map-badge" style={{ color: 'var(--color-neon-green)' }}>● LIVE</span>
            </div>

            {/* City Grid Background */}
            <svg
                width="100%"
                viewBox="0 0 440 340"
                style={{ display: 'block', minHeight: 300 }}
            >
                {/* Background */}
                <rect width="440" height="340" fill="#020b14" />

                {/* Grid lines (city streets) */}
                {[60, 130, 200, 270, 340].map(x => (
                    <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={340} stroke="rgba(0,245,255,0.05)" strokeWidth="1" />
                ))}
                {[60, 130, 200, 270].map(y => (
                    <line key={`hy${y}`} x1={0} y1={y} x2={440} y2={y} stroke="rgba(0,245,255,0.05)" strokeWidth="1" />
                ))}

                {/* City blocks */}
                {[
                    [70, 70, 50, 50], [140, 70, 70, 50], [230, 70, 50, 50], [300, 70, 30, 50],
                    [70, 150, 40, 60], [130, 150, 90, 60], [240, 150, 60, 60], [320, 150, 50, 60],
                    [70, 240, 60, 50], [160, 240, 40, 50], [230, 240, 80, 50], [330, 240, 40, 50],
                ].map(([x, y, w, h], i) => (
                    <rect key={i} x={x} y={y} width={w} height={h}
                        fill="rgba(0,245,255,0.03)" stroke="rgba(0,245,255,0.07)" strokeWidth="1" rx="2" />
                ))}

                {/* Connection lines between nodes */}
                {mapNodes.map((n, i) => (
                    mapNodes.slice(i + 1, i + 2).map((m, j) => (
                        <line key={`l${i}${j}`}
                            x1={n.x} y1={n.y} x2={m.x} y2={m.y}
                            stroke="rgba(0,245,255,0.1)" strokeWidth="1" strokeDasharray="4 4"
                        />
                    ))
                ))}

                {/* Pulse rings on each node */}
                {mapNodes.map((n, i) => (
                    <g key={`p${i}`}>
                        <circle cx={n.x} cy={n.y} r="20"
                            fill="none" stroke={n.color} strokeWidth="1" opacity="0">
                            <animate attributeName="r" from="10" to="40" dur="2s" repeatCount="indefinite"
                                begin={`${i * 0.6}s`} />
                            <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"
                                begin={`${i * 0.6}s`} />
                        </circle>
                        <circle cx={n.x} cy={n.y} r="14"
                            fill="none" stroke={n.color} strokeWidth="0.5" opacity="0">
                            <animate attributeName="r" from="6" to="30" dur="2.5s" repeatCount="indefinite"
                                begin={`${i * 0.6 + 0.4}s`} />
                            <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite"
                                begin={`${i * 0.6 + 0.4}s`} />
                        </circle>
                    </g>
                ))}

                {/* Node dots */}
                {mapNodes.map((n, i) => (
                    <g key={`n${i}`}>
                        {/* Outer glow */}
                        <circle cx={n.x} cy={n.y} r="10" fill={n.color} opacity="0.2" />
                        {/* Node body */}
                        <circle cx={n.x} cy={n.y} r="7" fill={n.color} />
                        <circle cx={n.x} cy={n.y} r="4" fill="rgba(0,0,0,0.5)" />
                        {/* Label */}
                        <text x={n.x} y={n.y + 22} textAnchor="middle"
                            fill={n.color} fontSize="9" fontFamily="Orbitron, monospace" fontWeight="700">
                            {n.nodeId.replace('NODE-0', 'N')}
                        </text>
                        <text x={n.x} y={n.y + 33} textAnchor="middle"
                            fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="Inter, sans-serif">
                            {n.zone}
                        </text>
                    </g>
                ))}

                {/* Legend */}
                <g transform="translate(10, 310)">
                    {[
                        ['#00ff88', 'Healthy'],
                        ['#ffb800', 'Warning'],
                        ['#ff2d55', 'Critical'],
                    ].map(([color, label], i) => (
                        <g key={i} transform={`translate(${i * 110}, 0)`}>
                            <circle cx="6" cy="6" r="5" fill={color} />
                            <text x="15" y="10" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter, sans-serif">
                                {label}
                            </text>
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    )
}
