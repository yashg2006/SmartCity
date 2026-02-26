import { useState } from 'react'

function getStatus(node, incidents) {
    const activeIncidents = incidents.filter(i => i.nodeId === node.nodeId);
    if (activeIncidents.length > 0) return 'critical'; // Any active incident = critical/warning state
    if (node.gasLevel > 1100 || (node.drainDistance && node.drainDistance > 30)) return 'warning';
    return 'healthy';
}

export default function MunicipalPortal({ nodes, showToast, user, incidents }) {
    const [filter, setFilter] = useState('all')

    const displayNodes = filter === 'all'
        ? nodes
        : nodes.filter(n => getStatus(n, incidents) === filter)

    const handleAction = async (node, action) => {
        const incident = incidents.find(i => i.nodeId === node.nodeId);
        if (!incident && action === 'dispatch') {
            // If no incident but manual dispatch requested
            showToast('🚐 Dispatching...', `Sending crew to ${node.zone}`, 'success');
            return;
        }

        if (incident) {
            try {
                const res = await fetch(`http://localhost:5000/api/sensors/incidents/${incident._id}/${action}`, {
                    method: 'POST'
                });
                if (res.ok) {
                    showToast(
                        action === 'dispatch' ? '🚐 Crew Dispatched!' : '✅ Issue Resolved',
                        `${action === 'dispatch' ? 'Crew assigned to' : 'Alert cleared for'} ${node.zone}`,
                        'success'
                    );
                }
            } catch (err) {
                showToast('❌ Error', 'Failed to update incident', 'error');
            }
        }
    }

    const criticalCount = nodes.filter(n => getStatus(n, incidents) === 'critical').length
    const warningCount = nodes.filter(n => getStatus(n, incidents) === 'warning').length
    const healthyCount = nodes.filter(n => getStatus(n, incidents) === 'healthy').length

    const canManage = user?.role === 'admin' || user?.role === 'municipal'

    return (
        <div>
            {/* ... breadcrumb and header remain same ... */}
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
                    { id: 'critical', label: `Pending Critical (${criticalCount})`, count: criticalCount, color: 'var(--gov-red)' },
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
                                <th>Zone</th>
                                <th>Fill Level</th>
                                <th>Gas</th>
                                <th>Drainage</th>
                                <th>Incident Status</th>
                                <th>Action Taken</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayNodes.map(node => {
                                const activeIncident = incidents.find(i => i.nodeId === node.nodeId);
                                const status = getStatus(node, incidents)
                                const fillPct = Math.min(100, Math.max(0, Math.round(((50 - node.distance) / 50) * 100)))

                                return (
                                    <tr key={node.nodeId}>
                                        <td><strong style={{ color: 'var(--gov-blue)' }}>{node.nodeId}</strong></td>
                                        <td>{node.zone}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, width: 60, height: 6, background: '#f0f4f8', borderRadius: 3 }}>
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
                                        <td><span className={`status-chip ${node.drainDistance > 50 ? 'critical' : 'healthy'}`}>{node.drainDistance || 0} cm</span></td>
                                        <td>
                                            {activeIncident ? (
                                                <span className={`status-chip ${activeIncident.status === 'DISPATCHED' ? 'warning' : 'critical'}`}>
                                                    {activeIncident.status}
                                                </span>
                                            ) : (
                                                <span className="status-chip healthy">NOMINAL</span>
                                            )}
                                        </td>
                                        <td>
                                            {!canManage ? (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View Only</span>
                                            ) : activeIncident ? (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {activeIncident.status === 'ACTIVE' && (
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleAction(node, 'dispatch')}>Dispatch</button>
                                                    )}
                                                    <button className="btn btn-sm btn-success" onClick={() => handleAction(node, 'resolve')}>Resolve</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-sm btn-outline" onClick={() => handleAction(node, 'dispatch')}>Manual Dispatch</button>
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
