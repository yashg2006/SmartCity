import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../config'

const BIN_DEPTH = 50 // cm — bin depth from ultrasonic sensor on lid to bottom
const SECTORS = [
    { id: 'sector-4a', name: 'Sector 4A', location: 'Main Market Zone', enabled: true },
    { id: 'sector-1b', name: 'Sector 1B', location: 'North Residential Area', enabled: false },
    { id: 'sector-2c', name: 'Sector 2C', location: 'East Ring Road', enabled: false },
    { id: 'sector-3d', name: 'Sector 3D', location: 'South Commercial Zone', enabled: false },
    { id: 'sector-5e', name: 'Sector 5E', location: 'West Housing Colony', enabled: false },
    { id: 'sector-6f', name: 'Sector 6F', location: 'Industrial Area', enabled: false },
]

function getBinStatus(distance) {
    if (distance == null) return { status: 'NO DATA', fillPct: 0, color: 'var(--text-muted)' }
    const fillPct = Math.max(0, Math.min(100, Math.round(((BIN_DEPTH - distance) / BIN_DEPTH) * 100)))
    if (fillPct > 85) return { status: 'CRITICAL', fillPct, color: 'var(--gov-red)' }
    if (fillPct > 65) return { status: 'WARNING', fillPct, color: 'var(--gov-amber)' }
    return { status: 'HEALTHY', fillPct, color: 'var(--gov-green)' }
}

export default function GarbageDetection({ nodes, history = [], connected, showToast, user }) {
    const [selectedSector, setSelectedSector] = useState('sector-4a')
    const [reportImage, setReportImage] = useState(null)
    const [reportImagePreview, setReportImagePreview] = useState(null)
    const [reportLocation, setReportLocation] = useState('')
    const [reportDescription, setReportDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [reports, setReports] = useState([])
    const fileInputRef = useRef(null)

    const activeNode = nodes.find(n => n.zone === 'Sector 4A' || n.nodeId === 'NODE-001') || null
    const binHistory = history.filter(h => h.distance != null && h.distance > 0)

    const binStatus = activeNode ? getBinStatus(activeNode.distance) : { status: 'OFFLINE', fillPct: 0, color: 'var(--text-muted)' }

    // Fetch existing reports
    useEffect(() => {
        fetch(`${API_URL}/api/sensors/reports`)
            .then(r => r.json())
            .then(data => setReports(data))
            .catch(err => console.error('Failed to fetch reports', err))
    }, [])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setReportImage(reader.result)
            setReportImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmitReport = async () => {
        if (!reportImage || !reportLocation.trim()) {
            showToast('Missing Fields', 'Please add an image and location', 'warning')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/api/sensors/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData: reportImage,
                    location: reportLocation.trim(),
                    description: reportDescription.trim(),
                    reportedBy: user?.name || 'Citizen'
                })
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Report Submitted!', 'Your garbage report has been sent to the Municipal Corporation.', 'success')
                setReportImage(null)
                setReportImagePreview(null)
                setReportLocation('')
                setReportDescription('')
                if (fileInputRef.current) fileInputRef.current.value = ''
                // Refresh reports
                const rRes = await fetch(`${API_URL}/api/sensors/reports`)
                const rData = await rRes.json()
                setReports(rData)
            } else {
                showToast('Error', 'Failed to submit report', 'error')
            }
        } catch (err) {
            showToast('Error', 'Failed to submit report. Check server connection.', 'error')
        }
        setSubmitting(false)
    }

    return (
        <div>
            <div className="breadcrumb">
                <span>Monitoring</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Garbage Detection</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">🗑️ Garbage Detection & Reporting</h2>
                    <p className="page-subtitle">Smart bin monitoring & citizen garbage reporting system</p>
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

            {/* Bin Stats */}
            <div className="stats-grid" style={{ marginTop: 20 }}>
                <div className="card stat-card" style={{ '--accent-color': binStatus.color }}>
                    <div className="stat-label">Bin Fill Level</div>
                    <div className="stat-value">{binStatus.fillPct}<span className="stat-unit">%</span></div>
                    <div className="stat-trend">{binStatus.status === 'CRITICAL' ? '⚠️ May overflow soon' : binStatus.status === 'WARNING' ? 'Approaching capacity' : 'Within safe range'}</div>
                    <span className="stat-icon-bg">🗑️</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': binStatus.color }}>
                    <div className="stat-label">Bin Status</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{binStatus.status}</div>
                    <div className="stat-trend">{activeNode ? 'Real-time reading' : 'Waiting for hardware'}</div>
                </div>
                <div className="card stat-card" style={{ '--accent-color': 'var(--gov-blue)' }}>
                    <div className="stat-label">Ultrasonic Distance</div>
                    <div className="stat-value">{activeNode?.distance ?? '—'}<span className="stat-unit">cm</span></div>
                    <div className="stat-trend">Sensor (lid) → Garbage surface</div>
                    <span className="stat-icon-bg">📏</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': 'var(--gov-saffron)' }}>
                    <div className="stat-label">Citizen Reports</div>
                    <div className="stat-value">{reports.length}</div>
                    <div className="stat-trend">Total garbage reports submitted</div>
                    <span className="stat-icon-bg">📸</span>
                </div>
            </div>

            {/* Bin Visualization + Citizen Reporting side by side */}
            <div className="grid-2" style={{ marginTop: 20 }}>
                {/* Bin visualization */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🔬 Bin Cross-Section</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0, display: 'flex', justifyContent: 'center', background: '#f8fbf7' }}>
                        <svg viewBox="0 0 300 320" width="100%" style={{ maxWidth: 300, display: 'block' }}>
                            {/* Bin body (trapezoid shape) */}
                            <path d="M 60 60 L 50 280 L 250 280 L 240 60 Z" fill="#e0e0e0" stroke="#bbb" strokeWidth="2" />
                            <path d="M 70 68 L 60 272 L 240 272 L 230 68 Z" fill="#fafafa" stroke="#eee" strokeWidth="1" />

                            {/* Garbage fill */}
                            <clipPath id="binClip">
                                <path d="M 70 68 L 60 272 L 240 272 L 230 68 Z" />
                            </clipPath>
                            <rect
                                x="50" y={272 - (binStatus.fillPct / 100 * 204)}
                                width="200" height={binStatus.fillPct / 100 * 204}
                                fill={binStatus.fillPct > 85 ? 'rgba(211,47,47,0.3)' : binStatus.fillPct > 65 ? 'rgba(245,124,0,0.25)' : 'rgba(85,139,47,0.2)'}
                                clipPath="url(#binClip)"
                            />

                            {/* Lid */}
                            <rect x="45" y="50" width="210" height="14" rx="4" fill="#9e9e9e" stroke="#757575" strokeWidth="1.5" />

                            {/* Ultrasonic sensor on lid */}
                            <rect x="130" y="40" width="40" height="12" rx="3" fill="#2196f3" stroke="#1565c0" strokeWidth="1" />
                            <text x="150" y="49" fill="#fff" fontSize="7" fontWeight="700" textAnchor="middle">US</text>

                            {/* Distance line from sensor to garbage */}
                            <line x1="150" y1="64" x2="150" y2={272 - (binStatus.fillPct / 100 * 204)} stroke="#2196f3" strokeDasharray="4 4" strokeWidth="1.5" />
                            <text x="162" y={170} fill="#1565c0" fontSize="9" fontWeight="600">
                                {activeNode?.distance ?? '?'}cm
                            </text>

                            {/* Fill level label */}
                            <text x="150" y="295" textAnchor="middle" fill="#999" fontSize="10">
                                Fill: {binStatus.fillPct}% ({BIN_DEPTH - (activeNode?.distance || BIN_DEPTH)}cm / {BIN_DEPTH}cm)
                            </text>

                            {/* Overflow warning */}
                            {binStatus.fillPct > 85 && (
                                <g>
                                    <text x="150" y="30" textAnchor="middle" fill="var(--gov-red)" fontSize="12" fontWeight="700">
                                        ⚠️ OVERFLOW RISK
                                    </text>
                                    <rect x="45" y="50" width="210" height="14" rx="4" fill="rgba(211,47,47,0.2)">
                                        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1s" repeatCount="indefinite" />
                                    </rect>
                                </g>
                            )}
                        </svg>
                    </div>
                    {activeNode && (
                        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)' }}>
                            <strong>Last Reading:</strong> {activeNode.timestamp ? new Date(activeNode.timestamp).toLocaleString() : 'N/A'}
                            {' · '}<strong>Node:</strong> {activeNode.nodeId}
                        </div>
                    )}
                </div>

                {/* Citizen Reporting */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📸 Report Garbage</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send to Municipal Corporation</span>
                    </div>
                    <div className="card-body">
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                            Spotted garbage in your area? Take a photo and report it directly to the Municipal Corporation.
                            Your report will be reviewed and action will be taken.
                        </p>

                        {/* Image Upload */}
                        <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
                            {reportImagePreview ? (
                                <img src={reportImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Click to capture / upload photo</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Supports JPG, PNG — max 5MB</div>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Location */}
                        <div style={{ marginTop: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Location *</label>
                            <input
                                type="text"
                                placeholder="e.g., Near Park, Sector 4A"
                                value={reportLocation}
                                onChange={e => setReportLocation(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: 13,
                                    background: 'var(--surface-input)',
                                    fontFamily: 'var(--font-body)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--gov-blue)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>

                        {/* Description */}
                        <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description (optional)</label>
                            <textarea
                                placeholder="Describe the garbage issue..."
                                value={reportDescription}
                                onChange={e => setReportDescription(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: 13,
                                    background: 'var(--surface-input)',
                                    fontFamily: 'var(--font-body)',
                                    resize: 'vertical',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--gov-blue)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitReport}
                            disabled={submitting}
                            style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: '12px 20px' }}
                        >
                            {submitting ? '⏳ Submitting...' : '📤 Submit Report to Municipal Corporation'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Reports */}
            {reports.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">📋 Recent Citizen Reports</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reports.length} reports</span>
                    </div>
                    <div className="card-body" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Location</th>
                                    <th>Description</th>
                                    <th>Reported By</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report, i) => (
                                    <tr key={report._id || i}>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{report.location}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {report.description || '—'}
                                        </td>
                                        <td>{report.reportedBy}</td>
                                        <td>
                                            <span className={`status-chip ${report.status === 'RESOLVED' ? 'healthy' : report.status === 'ACKNOWLEDGED' ? 'warning' : 'critical'}`} style={{ fontSize: 10 }}>
                                                {report.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bin History */}
            {binHistory.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">📜 Bin Sensor Logs</h3>
                        <span style={{ fontSize: 11, color: 'var(--gov-blue)', fontWeight: 600 }}>⚡ LIVE FROM ESP32</span>
                    </div>
                    <div className="card-body" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Node</th>
                                    <th>Distance (cm)</th>
                                    <th>Fill Level</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {binHistory.slice(0, 30).map((log, i) => {
                                    const logStatus = getBinStatus(log.distance)
                                    return (
                                        <tr key={log.timestamp + i} style={{ opacity: 1 - (i * 0.02) }}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{log.nodeId}</td>
                                            <td>{log.distance}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                                                    <div style={{ flex: 1, height: 6, background: '#f0f4f8', borderRadius: 3 }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${logStatus.fillPct}%`,
                                                            background: logStatus.color,
                                                            borderRadius: 3
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 11 }}>{logStatus.fillPct}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-chip ${logStatus.status === 'CRITICAL' ? 'critical' : logStatus.status === 'WARNING' ? 'warning' : 'healthy'}`} style={{ fontSize: 10 }}>
                                                    {logStatus.status}
                                                </span>
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
            {!activeNode && binHistory.length === 0 && (
                <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Waiting for Bin Sensor Data</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        Connect your ESP32 with ultrasonic sensor on the bin lid to start monitoring.
                        <br />
                        POST sensor data to <code>{API_URL}/api/sensors/data</code>
                    </p>
                </div>
            )}
        </div>
    )
}
