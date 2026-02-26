import XpBar from './XpBar'
import SensorMap from './SensorMap'

function getNodeStatus(node, incidents) {
    const hasIncident = incidents && incidents.some(i => i.nodeId === node.nodeId)
    if (hasIncident) return 'critical'
    if (node.gasLevel > 1100 || (node.drainDistance && node.drainDistance > 30)) return 'warning'
    return 'healthy'
}

function StatCard({ label, value, unit, icon, accent, trend }) {
    return (
        <div className="card stat-card" style={{ '--accent-color': accent }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">
                {value}<span className="stat-unit">{unit}</span>
            </div>
            <div className={`stat-trend ${trend?.dir}`}>
                {trend?.dir === 'up' ? '↑' : trend?.dir === 'down' ? '↓' : '•'} {trend?.text}
            </div>
            <span className="stat-icon-bg">{icon}</span>
        </div>
    )
}

export default function Dashboard({ nodes, alerts, user, incidents = [] }) {
    const totalNodes = nodes.length
    const criticalCount = incidents.length
    const avgGas = Math.round(nodes.reduce((s, n) => s + n.gasLevel, 0) / (totalNodes || 1))
    const avgFill = Math.round(nodes.reduce((s, n) => s + (n.distance > 0 ? (Math.max(0, 50 - n.distance) / 50 * 100) : 0), 0) / (totalNodes || 1))

    return (
        <div>
            <div className="breadcrumb">
                <span>Home</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Monitoring Dashboard</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">Operational Overview</h2>
                    <p className="page-subtitle">Department of Urban Planning · Live Infrastructure Status</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <span className="status-chip live">● LIVE SYSTEM</span>
                    {criticalCount > 0 && (
                        <span className="status-chip critical">⚠ {criticalCount} ALERTS</span>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    label="Total Sensor Nodes"
                    value={totalNodes}
                    icon="📡"
                    accent="var(--gov-blue)"
                    trend={{ text: 'All units stable', dir: 'up' }}
                />
                <StatCard
                    label="Critical Hazards"
                    value={criticalCount}
                    icon="🚨"
                    accent={criticalCount > 0 ? 'var(--gov-red)' : 'var(--gov-green)'}
                    trend={{ text: criticalCount > 0 ? 'Attention required' : 'Clear', dir: criticalCount > 0 ? 'down' : 'up' }}
                />
                <StatCard
                    label="Avg Gas Concentration"
                    value={avgGas}
                    unit="ppm"
                    icon="☣️"
                    accent={avgGas > 1500 ? 'var(--gov-amber)' : 'var(--gov-blue)'}
                    trend={{ text: 'Normal range', dir: '' }}
                />
                <StatCard
                    label="System Health"
                    value="98.4"
                    unit="%"
                    icon="⚙️"
                    accent="var(--gov-green)"
                    trend={{ text: 'Uptime target met', dir: 'up' }}
                />
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📍 Geographic Network Status</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <SensorMap nodes={nodes} />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">⚡ Real-time Telemetry</h3>
                    </div>
                    <div className="card-body">
                        {nodes.map(node => {
                            const status = getNodeStatus(node, incidents)
                            // Capacity calculation based on 50cm deep bin
                            const fillPct = Math.min(100, Math.max(0, Math.round(((50 - node.distance) / 50) * 100)))
                            const gasPct = Math.min(100, Math.round((node.gasLevel / 3000) * 100))

                            const binColor = fillPct > 85 ? 'var(--gov-red)' : fillPct > 65 ? 'var(--gov-amber)' : 'var(--gov-green)'
                            const gasColor = gasPct > 75 ? 'var(--gov-red)' : gasPct > 40 ? 'var(--gov-amber)' : 'var(--gov-blue)'

                            return (
                                <div key={node.nodeId} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gov-blue)' }}>{node.nodeId} · {node.zone}</span>
                                        <span className={`status-chip ${status}`}>{status.toUpperCase()}</span>
                                    </div>
                                    <XpBar
                                        label="Bin Capacity"
                                        value={fillPct}
                                        startColor={binColor}
                                        endColor={binColor}
                                    />
                                    <XpBar
                                        label="Hazard Gas Level"
                                        value={gasPct}
                                        startColor={gasColor}
                                        endColor={gasColor}
                                    />
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                                        <span>💧 Drainage: <strong style={{ color: node.drainDistance > 50 ? 'var(--gov-red)' : 'inherit' }}>{node.drainDistance || 0} cm</strong></span>
                                        <span>🔋 Power: <strong>{Math.round(node.batteryLevel)}%</strong></span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
