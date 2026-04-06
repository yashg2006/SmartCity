import { useState, useEffect } from 'react'
import { API_URL } from '../config'

const PIPE_DEPTH = 30 // cm — total internal pipe diameter
const SECTORS = [
    { id: 'sector-4a', name: 'Sector 4A', location: 'Main Pipeline Junction', enabled: true },
    { id: 'sector-1b', name: 'Sector 1B', location: 'North Canal Road', enabled: false },
    { id: 'sector-2c', name: 'Sector 2C', location: 'East Ring Road', enabled: false },
    { id: 'sector-3d', name: 'Sector 3D', location: 'South Commercial Zone', enabled: false },
    { id: 'sector-5e', name: 'Sector 5E', location: 'West Housing Colony', enabled: false },
    { id: 'sector-6f', name: 'Sector 6F', location: 'Industrial Area', enabled: false },
]

function getFlowDiagnosis(waterStatus, drainDistance) {
    if (!waterStatus || drainDistance == null) return { status: 'NO DATA', color: 'var(--text-muted)', icon: '❓', desc: 'Waiting for sensor data...' }

    const waterLevel = Math.max(0, PIPE_DEPTH - drainDistance)
    const fillPct = Math.round((waterLevel / PIPE_DEPTH) * 100)

    if (waterStatus === 'DRY') {
        return { status: 'NO FLOW', color: 'var(--gov-red)', icon: '🚫', desc: 'Water sensor is dry — no water flowing through this section. Possible blockage upstream.', waterLevel, fillPct }
    }
    if (waterStatus === 'OVERFLOW') {
        return { status: 'OVERFLOW', color: 'var(--gov-red)', icon: '🌊', desc: 'Water level critical — overflow detected!', waterLevel, fillPct: 100 }
    }
    // NORMAL — water is flowing
    if (fillPct > 80) {
        return { status: 'HIGH FLOW', color: 'var(--gov-amber)', icon: '⚡', desc: `Water is flowing at high volume. Level: ${waterLevel}cm (${fillPct}% pipe capacity). Monitor for potential overflow.`, waterLevel, fillPct }
    }
    if (fillPct > 30) {
        return { status: 'NORMAL FLOW', color: 'var(--gov-green)', icon: '✅', desc: `Water is flowing normally. Level: ${waterLevel}cm (${fillPct}% pipe capacity). System healthy.`, waterLevel, fillPct }
    }
    return { status: 'LOW FLOW', color: 'var(--gov-amber)', icon: '💧', desc: `Water is flowing but at low volume. Level: ${waterLevel}cm (${fillPct}% pipe capacity). Trickle flow detected.`, waterLevel, fillPct }
}

export default function WaterDrainage({ nodes, history = [], connected }) {
    const [selectedSector, setSelectedSector] = useState('sector-4a')

    // Find the active hardware node for Sector 4A
    const activeNode = nodes.find(n => n.zone === 'Sector 4A' || n.nodeId === 'NODE-001') || null
    const drainHistory = history.filter(h => h.drainDistance != null)

    const diagnosis = activeNode
        ? getFlowDiagnosis(activeNode.waterStatus, activeNode.drainDistance)
        : { status: 'OFFLINE', color: 'var(--text-muted)', icon: '📡', desc: 'Waiting for hardware connection...', waterLevel: 0, fillPct: 0 }

    const waterLevel = diagnosis.waterLevel || 0
    const fillPct = diagnosis.fillPct || 0

    return (
        <div>
            <div className="breadcrumb">
                <span>Monitoring</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Water Drainage System</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">💧 Water Drainage Monitoring</h2>
                    <p className="page-subtitle">Real-time pipeline flow analysis & water level tracking</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {connected ? (
                        <span className="status-chip live">● LIVE HARDWARE</span>
                    ) : (
                        <span className="status-chip warning">⏳ AWAITING CONNECTION</span>
                    )}
                </div>
            </div>

            {/* Sector Selection */}
            <div className="sector-grid">
                {SECTORS.map(sector => (
                    <button
                        key={sector.id}
                        className={`sector-card ${selectedSector === sector.id ? 'active' : ''} ${!sector.enabled ? 'disabled' : ''}`}
                        onClick={() => sector.enabled && setSelectedSector(sector.id)}
                        disabled={!sector.enabled}
                    >
                        <div className="sector-card-header">
                            <span className="sector-name">{sector.name}</span>
                            {sector.enabled ? (
                                <span className="status-chip live" style={{ fontSize: 9, padding: '2px 6px' }}>● LIVE</span>
                            ) : (
                                <span className="status-chip" style={{ fontSize: 9, padding: '2px 6px', background: '#f0f4f8', color: '#9e9e9e', border: '1px solid #e0e0e0' }}>NO HW</span>
                            )}
                        </div>
                        <span className="sector-location">{sector.location}</span>
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginTop: 20 }}>
                <div className="card stat-card" style={{ '--accent-color': diagnosis.color }}>
                    <div className="stat-label">Flow Status</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{diagnosis.icon} {diagnosis.status}</div>
                    <div className="stat-trend">{activeNode ? 'Real-time sensor' : 'No data'}</div>
                </div>
                <div className="card stat-card" style={{ '--accent-color': fillPct > 80 ? 'var(--gov-amber)' : 'var(--gov-blue)' }}>
                    <div className="stat-label">Water Level</div>
                    <div className="stat-value">{waterLevel}<span className="stat-unit">cm</span></div>
                    <div className="stat-trend">of {PIPE_DEPTH}cm pipe depth</div>
                    <span className="stat-icon-bg">💧</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': fillPct > 80 ? 'var(--gov-red)' : fillPct > 50 ? 'var(--gov-amber)' : 'var(--gov-green)' }}>
                    <div className="stat-label">Pipe Fill</div>
                    <div className="stat-value">{fillPct}<span className="stat-unit">%</span></div>
                    <div className="stat-trend">{fillPct > 80 ? 'Warning — monitor closely' : 'Within safe range'}</div>
                    <span className="stat-icon-bg">🔄</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': 'var(--gov-blue)' }}>
                    <div className="stat-label">Ultrasonic Distance</div>
                    <div className="stat-value">{activeNode?.drainDistance ?? '—'}<span className="stat-unit">cm</span></div>
                    <div className="stat-trend">Sensor → Water surface</div>
                    <span className="stat-icon-bg">📏</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': activeNode?.waterQuality === 'HAZARDOUS' ? 'var(--gov-red)' : activeNode?.waterQuality === 'DIRTY' ? 'var(--gov-amber)' : 'var(--gov-green)' }}>
                    <div className="stat-label">Water Quality</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>{activeNode?.waterQuality ?? '—'}</div>
                    <div className="stat-trend">{activeNode?.turbidity != null ? `${Math.round(activeNode.turbidity)} NTU` : 'Turbidity sensor'}</div>
                    <span className="stat-icon-bg">🔬</span>
                </div>
            </div>

            {/* Pipeline Visualization + Diagnosis */}
            <div className="grid-2" style={{ marginTop: 20 }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🔬 Pipeline Cross-Section</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0, display: 'flex', justifyContent: 'center', background: '#f8fbf7' }}>
                        <svg viewBox="0 0 400 280" width="100%" style={{ maxWidth: 400, display: 'block' }}>
                            {/* Pipe body */}
                            <rect x="40" y="40" width="320" height="180" rx="16" fill="#e8e8e8" stroke="#bbb" strokeWidth="3" />
                            <rect x="50" y="50" width="300" height="160" rx="12" fill="#f5f9ff" stroke="#ddd" strokeWidth="1" />

                            {/* Water fill */}
                            <clipPath id="pipeClip">
                                <rect x="50" y="50" width="300" height="160" rx="12" />
                            </clipPath>
                            <rect
                                x="50"
                                y={210 - (fillPct / 100 * 160)}
                                width="300"
                                height={fillPct / 100 * 160}
                                fill={fillPct > 80 ? 'rgba(211,47,47,0.25)' : 'rgba(33,150,243,0.3)'}
                                clipPath="url(#pipeClip)"
                            >
                                {activeNode?.waterStatus === 'NORMAL' && (
                                    <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2s" repeatCount="indefinite" />
                                )}
                            </rect>

                            {/* Flow arrows (if flowing) */}
                            {activeNode?.waterStatus === 'NORMAL' && (
                                <g>
                                    <text x="120" y={210 - (fillPct / 100 * 160) + 20} fill="rgba(33,150,243,0.6)" fontSize="18" fontWeight="bold">
                                        → → →
                                        <animate attributeName="x" values="80;250;80" dur="3s" repeatCount="indefinite" />
                                    </text>
                                </g>
                            )}

                            {/* Water sensor position (inside pipe at fixed height) */}
                            <g>
                                <rect x="60" y="140" width="30" height="8" rx="2" fill="#4caf50" stroke="#388e3c" strokeWidth="1" />
                                <text x="95" y="148" fill="#388e3c" fontSize="9" fontWeight="600">Water Sensor</text>
                                <line x1="75" y1="148" x2="75" y2="210" stroke="#4caf50" strokeDasharray="3 3" strokeWidth="1" opacity="0.5" />
                            </g>

                            {/* Ultrasonic sensor (on top of pipe, facing down) */}
                            <g>
                                <rect x="270" y="38" width="40" height="14" rx="3" fill="#2196f3" stroke="#1565c0" strokeWidth="1" />
                                <text x="290" y="48" fill="#fff" fontSize="7" fontWeight="700" textAnchor="middle">US</text>
                                <line x1="290" y1="52" x2="290" y2={210 - (fillPct / 100 * 160)} stroke="#2196f3" strokeDasharray="4 4" strokeWidth="1.5" />
                                <text x="298" y={130} fill="#1565c0" fontSize="8" fontWeight="600">
                                    {activeNode?.drainDistance ?? '?'}cm
                                </text>
                            </g>

                            {/* Labels */}
                            <text x="200" y="232" textAnchor="middle" fill="#999" fontSize="10">Water Level: {waterLevel}cm / {PIPE_DEPTH}cm</text>
                            <text x="200" y="248" textAnchor="middle" fill={activeNode?.waterQuality === 'HAZARDOUS' ? '#d32f2f' : activeNode?.waterQuality === 'DIRTY' ? '#f57c00' : '#388e3c'} fontSize="9" fontWeight="600">
                                🔬 Turbidity: {activeNode?.turbidity != null ? `${Math.round(activeNode.turbidity)} NTU — ${activeNode.waterQuality}` : 'No data'}
                            </text>

                            {/* DRY indicator */}
                            {activeNode?.waterStatus === 'DRY' && (
                                <text x="200" y="150" textAnchor="middle" fill="var(--gov-red)" fontSize="14" fontWeight="700">
                                    ⛔ NO FLOW DETECTED
                                </text>
                            )}

                            {/* Water surface wavy line */}
                            {fillPct > 0 && activeNode?.waterStatus !== 'DRY' && (
                                <path
                                    d={`M 50 ${210 - (fillPct / 100 * 160)} Q 125 ${210 - (fillPct / 100 * 160) - 4} 200 ${210 - (fillPct / 100 * 160)} T 350 ${210 - (fillPct / 100 * 160)}`}
                                    fill="none" stroke="rgba(33,150,243,0.5)" strokeWidth="2"
                                />
                            )}
                        </svg>
                    </div>
                    {/* Turbidity color bar */}
                    {activeNode?.turbidity != null && (
                        <div style={{ padding: '8px 16px', background: '#f7f9fc', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Water Clarity:</span>
                            <div style={{ flex: 1, height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(100, (activeNode.turbidity / 3000) * 100)}%`,
                                    background: activeNode.turbidity > 1500 ? '#d32f2f' : activeNode.turbidity > 500 ? '#f57c00' : activeNode.turbidity > 50 ? '#ffd54f' : '#4caf50',
                                    borderRadius: 4, transition: 'width 0.5s'
                                }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: activeNode.turbidity > 1500 ? '#d32f2f' : '#388e3c' }}>
                                {Math.round(activeNode.turbidity)} NTU
                            </span>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📋 Flow Diagnosis</h3>
                    </div>
                    <div className="card-body">
                        <div style={{
                            padding: 20,
                            borderRadius: 'var(--radius-md)',
                            background: `${diagnosis.color}10`,
                            border: `1px solid ${diagnosis.color}30`,
                            marginBottom: 20
                        }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>{diagnosis.icon}</div>
                            <h4 style={{ color: diagnosis.color, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{diagnosis.status}</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{diagnosis.desc}</p>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How it works</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14 }}>🟢</span>
                                    <span><strong>Water Sensor</strong> (inside pipe at fixed height) — Detects if water is touching it. Wet = water flowing. Dry = no flow.</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14 }}>🔵</span>
                                    <span><strong>Ultrasonic Sensor</strong> (top of pipe, facing down) — Measures distance to water surface. Short distance = high water level. Long distance = low water level.</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14 }}>🔗</span>
                                    <span><strong>Combined</strong> — Together they determine flow speed: flowing + high level = fast flow; flowing + low level = slow flow; dry = blockage.</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14 }}>🟤</span>
                                    <span><strong>Turbidity Sensor</strong> (submerged in water) — Measures water clarity in NTU. Clear (&lt;50 NTU) = clean. Dirty (&gt;500 NTU) = contaminated. Hazardous (&gt;1500 NTU) = sewage-level.</span>
                                </div>
                            </div>
                        </div>

                        {activeNode && (
                            <div style={{ marginTop: 16, padding: 12, background: '#f7f9fc', borderRadius: 'var(--radius-sm)', fontSize: 11 }}>
                                <strong>Last Reading:</strong> {activeNode.timestamp ? new Date(activeNode.timestamp).toLocaleString() : 'N/A'}
                                <br /><strong>Node:</strong> {activeNode.nodeId} · {activeNode.zone}
                                <br /><strong>Water Sensor:</strong> {activeNode.waterStatus}
                                <br /><strong>Ultrasonic:</strong> {activeNode.drainDistance ?? 'N/A'} cm
                                <br /><strong>Turbidity:</strong> {activeNode.turbidity != null ? `${Math.round(activeNode.turbidity)} NTU (${activeNode.waterQuality})` : 'N/A'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Table */}
            {drainHistory.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">📜 Drainage Sensor Logs</h3>
                        <span style={{ fontSize: 11, color: 'var(--gov-blue)', fontWeight: 600 }}>⚡ LIVE FROM ESP32</span>
                    </div>
                    <div className="card-body" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Node</th>
                                    <th>Drain Distance (cm)</th>
                                    <th>Water Level (cm)</th>
                                    <th>Fill %</th>
                                    <th>Turbidity</th>
                                    <th>Water Sensor</th>
                                    <th>Diagnosis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drainHistory.slice(0, 30).map((log, i) => {
                                    const logDiag = getFlowDiagnosis(log.waterStatus, log.drainDistance)
                                    return (
                                        <tr key={log.timestamp + i} style={{ opacity: 1 - (i * 0.02) }}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{log.nodeId}</td>
                                            <td>{log.drainDistance}</td>
                                            <td>{logDiag.waterLevel ?? '—'}</td>
                                            <td>{logDiag.fillPct ?? '—'}%</td>
                                            <td style={{ color: (log.turbidity || 0) > 1500 ? '#d32f2f' : (log.turbidity || 0) > 500 ? '#f57c00' : '#388e3c', fontWeight: 600, fontSize: 11 }}>
                                                {log.turbidity != null ? `${Math.round(log.turbidity)} NTU` : '—'}
                                            </td>
                                            <td>
                                                <span className={`status-chip ${log.waterStatus === 'NORMAL' ? 'healthy' : log.waterStatus === 'DRY' ? 'critical' : 'warning'}`} style={{ fontSize: 10 }}>
                                                    {log.waterStatus}
                                                </span>
                                            </td>
                                            <td style={{ color: logDiag.color, fontWeight: 600, fontSize: 11 }}>
                                                {logDiag.icon} {logDiag.status}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No data message */}
            {!activeNode && (
                <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Waiting for Hardware Data</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        Connect your ESP32 with water sensor + ultrasonic sensor to start monitoring.
                        <br />
                        POST sensor data to <code>{API_URL}/api/sensors/data</code>
                    </p>
                </div>
            )}
        </div>
    )
}
