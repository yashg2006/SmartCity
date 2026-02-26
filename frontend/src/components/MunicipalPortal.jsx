import { useState } from 'react'

function getStatus(node) {
    if (node.gasLevel > 2200 || node.waterStatus === 'OVERFLOW') return 'critical'
    if (node.gasLevel > 1100 || node.distance < 12) return 'warning'
    return 'healthy'
}

export default function MunicipalPortal({ nodes, showToast, user }) {
    const [dispatched, setDispatched] = useState({})
    const [filter, setFilter] = useState('all')

    const displayNodes = filter === 'all'
        ? nodes
        : nodes.filter(n => getStatus(n) === filter)

    const handleDispatch = (node) => {
        setDispatched(prev => ({ ...prev, [node.nodeId]: true }))
        showToast(
            '🚐 Crew Dispatched!',
            `Cleanup crew assigned to ${node.zone} (${node.nodeId})`,
            'success'
        )
    }

    const criticalCount = nodes.filter(n => getStatus(n) === 'critical').length
    const warningCount = nodes.filter(n => getStatus(n) === 'warning').length
    const healthyCount = nodes.filter(n => getStatus(n) === 'healthy').length

    const canManage = user?.role === 'admin' || user?.role === 'municipal'

    return (
        <div>
            <div className="breadcrumb">
                <span>Operations</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Service Management</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">Field Operations Registry</h2>
                    <p className="page-subtitle">Infrastructure maintenance & service request dispatch portal</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {[
                    { id: 'all', label: `Total Nodes (${nodes.length})`, count: nodes.length, color: 'var(--gov-blue)' },
                    { id: 'critical', label: `Critical Alerts (${criticalCount})`, count: criticalCount, color: 'var(--gov-red)' },
                    { id: 'warning', label: `Warnings (${warningCount})`, count: warningCount, color: 'var(--gov-amber)' },
                    { id: 'healthy', label: `Healthy (${healthyCount})`, count: healthyCount, color: 'var(--gov-green)' },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid',
                            borderColor: filter === f.id ? f.color : 'var(--border-color)',
                            background: filter === f.id ? `${f.color}10` : '#fff',
                            color: filter === f.id ? f.color : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="card-header">
                    <h3 className="card-title">📋 Sensor Network Registry</h3>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Showing {displayNodes.length} records</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Node ID</th>
                                <th>Administrative Zone</th>
                                <th>Fill Level</th>
                                <th>Gas Intensity</th>
                                <th>Drainage</th>
                                <th>Battery</th>
                                <th>Status</th>
                                <th>Operational Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayNodes.map(node => {
                                const status = getStatus(node)
                                const fillPct = Math.min(100, Math.max(0, Math.round(((50 - node.distance) / 50) * 100)))

                                return (
                                    <tr key={node.nodeId}>
                                        <td><strong style={{ color: 'var(--gov-blue)' }}>{node.nodeId}</strong></td>
                                        <td>{node.zone}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: '100px' }}>
                                                <div style={{ flex: 1, height: 6, background: '#f0f4f8', borderRadius: 3 }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${fillPct}%`,
                                                        background: fillPct > 85 ? 'var(--gov-red)' : fillPct > 65 ? 'var(--gov-amber)' : 'var(--gov-green)',
                                                        borderRadius: 3
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: 11 }}>{fillPct}%</span>
                                            </div>
                                        </td>
                                        <td><span style={{ color: node.gasLevel > 1100 ? 'var(--gov-amber)' : 'inherit' }}>{Math.round(node.gasLevel)} px</span></td>
                                        <td><span className={`status-chip ${node.waterStatus === 'OVERFLOW' ? 'critical' : 'healthy'}`}>{node.waterStatus}</span></td>
                                        <td>{Math.round(node.batteryLevel)}%</td>
                                        <td><span className={`status-chip ${status}`}>{status.toUpperCase()}</span></td>
                                        <td>
                                            {!canManage ? (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View Only</span>
                                            ) : dispatched[node.nodeId] ? (
                                                <button className="btn btn-success btn-sm" disabled>✓ Dispatched</button>
                                            ) : (
                                                <button
                                                    className={`btn btn-sm ${status === 'critical' ? 'btn-danger' : 'btn-outline'}`}
                                                    onClick={() => handleDispatch(node)}
                                                >
                                                    Dispatch Crew
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
