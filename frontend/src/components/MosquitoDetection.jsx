import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../config'

const RISK_LEVELS = [
    { max: 25, label: 'LOW', color: '#4caf50', bg: 'rgba(76,175,80,0.1)' },
    { max: 50, label: 'MODERATE', color: '#ff9800', bg: 'rgba(255,152,0,0.1)' },
    { max: 75, label: 'HIGH', color: '#f44336', bg: 'rgba(244,67,54,0.1)' },
    { max: 100, label: 'CRITICAL', color: '#b71c1c', bg: 'rgba(183,28,28,0.15)' },
]

function getRiskLevel(score) {
    return RISK_LEVELS.find(r => score <= r.max) || RISK_LEVELS[3]
}

export default function MosquitoDetection({ nodes, connected, showToast, user }) {
    const [capturedImage, setCapturedImage] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [location, setLocation] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState(null)
    const [reports, setReports] = useState([])
    const [riskZones, setRiskZones] = useState([])
    const [cameraOpen, setCameraOpen] = useState(false)
    const fileInputRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    // Fetch reports and risk zones on mount
    useEffect(() => {
        fetchReports()
        fetchRiskZones()
    }, [])

    const fetchReports = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mosquito/reports`)
            const data = await res.json()
            setReports(data)
        } catch (err) { console.error('Failed to fetch mosquito reports', err) }
    }

    const fetchRiskZones = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mosquito/risk-zones`)
            const data = await res.json()
            setRiskZones(data)
        } catch (err) { console.error('Failed to fetch risk zones', err) }
    }

    // ─── Camera Functions ─────────────────────────────────
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            streamRef.current = stream
            setCameraOpen(true)
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                }
            }, 100)
        } catch (err) {
            showToast('Camera Error', 'Could not access camera. Please use file upload.', 'error')
        }
    }

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(dataUrl)
        setImagePreview(dataUrl)
        closeCamera()
    }

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraOpen(false)
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setCapturedImage(reader.result)
            setImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    // ─── Analysis Submit ──────────────────────────────────
    const handleAnalyze = async () => {
        if (!capturedImage) {
            showToast('No Image', 'Please capture or upload a photo first', 'warning')
            return
        }
        if (!location.trim()) {
            showToast('No Location', 'Please enter the location', 'warning')
            return
        }

        setAnalyzing(true)
        setAnalysisResult(null)

        try {
            const res = await fetch(`${API_URL}/api/mosquito/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData: capturedImage,
                    location: location.trim(),
                    zone: 'Sector 4A',
                    reportedBy: user?.name || 'Citizen'
                })
            })
            const data = await res.json()

            if (data.success) {
                setAnalysisResult(data.analysis)
                showToast('Analysis Complete', `Result: ${data.analysis.mlResult} (Risk: ${data.analysis.riskScore}/100)`, data.analysis.riskScore > 60 ? 'error' : 'success')
                fetchReports()
                fetchRiskZones()
            } else {
                showToast('Error', data.error || 'Analysis failed', 'error')
            }
        } catch (err) {
            showToast('Error', 'Server connection failed', 'error')
        }
        setAnalyzing(false)
    }

    const resetForm = () => {
        setCapturedImage(null)
        setImagePreview(null)
        setLocation('')
        setAnalysisResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // ─── Sensor Data ──────────────────────────────────────
    const activeNode = nodes.find(n => n.zone === 'Sector 4A' || n.nodeId === 'NODE-001') || null
    const waterOverflow = activeNode?.waterStatus === 'OVERFLOW'
    const drainRisk = activeNode?.drainDistance != null && activeNode.drainDistance < 5

    // ─── Render ───────────────────────────────────────────
    return (
        <div>
            <div className="breadcrumb">
                <span>Monitoring</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Mosquito Detection</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">🦟 Smart Mosquito Detection</h2>
                    <p className="page-subtitle">AI-powered mosquito detection & breeding risk assessment</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {connected ? (
                        <span className="status-chip live">● SENSORS LIVE</span>
                    ) : (
                        <span className="status-chip warning">⏳ SENSORS OFFLINE</span>
                    )}
                </div>
            </div>

            {/* Environment Status Bar */}
            <div className="stats-grid" style={{ marginTop: 20 }}>
                <div className="card stat-card" style={{ '--accent-color': waterOverflow ? 'var(--gov-red)' : drainRisk ? 'var(--gov-amber)' : 'var(--gov-green)' }}>
                    <div className="stat-label">Water Stagnation</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>{waterOverflow ? 'DETECTED' : drainRisk ? 'RISK' : 'CLEAR'}</div>
                    <div className="stat-trend">{waterOverflow ? '🌊 Standing water — mosquito breeding likely' : drainRisk ? '⚠️ Drainage blockage risk' : '✅ No stagnation detected'}</div>
                    <span className="stat-icon-bg">💧</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': activeNode?.gasLevel > 2000 ? 'var(--gov-red)' : 'var(--gov-green)' }}>
                    <div className="stat-label">Environment Index</div>
                    <div className="stat-value">{activeNode?.gasLevel ?? '—'}</div>
                    <div className="stat-trend">Gas/humidity sensor (organic decay indicator)</div>
                    <span className="stat-icon-bg">🌡️</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': 'var(--gov-blue)' }}>
                    <div className="stat-label">Total Scans</div>
                    <div className="stat-value">{reports.length}</div>
                    <div className="stat-trend">Mosquito detection scans completed</div>
                    <span className="stat-icon-bg">📸</span>
                </div>
                <div className="card stat-card" style={{ '--accent-color': 'var(--gov-red)' }}>
                    <div className="stat-label">Detections</div>
                    <div className="stat-value">{reports.filter(r => r.mlResult === 'DETECTED').length}</div>
                    <div className="stat-trend">Confirmed mosquito presence</div>
                    <span className="stat-icon-bg">🦟</span>
                </div>
            </div>

            {/* Camera + Analysis Section */}
            <div className="grid-2" style={{ marginTop: 20 }}>
                {/* Left — Camera & Upload */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📱 Capture & Analyze</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Real-time ML inference</span>
                    </div>
                    <div className="card-body">
                        {/* Camera Options */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <button className="btn btn-primary" onClick={openCamera} style={{ flex: 1, justifyContent: 'center' }}>
                                📷 Open Camera
                            </button>
                            <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, justifyContent: 'center', background: 'var(--surface-input)', border: '1px solid var(--border-color)' }}>
                                📁 Upload Photo
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </div>

                        {/* Camera View */}
                        {cameraOpen && (
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 16, background: '#000' }}>
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                    <button onClick={capturePhoto} style={{
                                        width: 56, height: 56, borderRadius: '50%', border: '3px solid #fff',
                                        background: 'rgba(244,67,54,0.9)', cursor: 'pointer', fontSize: 20
                                    }}>📸</button>
                                    <button onClick={closeCamera} style={{
                                        width: 40, height: 40, borderRadius: '50%', border: '2px solid #fff',
                                        background: 'rgba(0,0,0,0.5)', cursor: 'pointer', color: '#fff', fontSize: 14,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>✕</button>
                                </div>
                                {/* Scan overlay */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    border: '2px solid rgba(76,175,80,0.5)', borderRadius: 'var(--radius-md)',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 8, left: 8, right: 8,
                                        fontSize: 11, color: '#4caf50', fontWeight: 600,
                                        textShadow: '0 1px 3px rgba(0,0,0,0.7)'
                                    }}>🦟 MOSQUITO SCANNER ACTIVE</div>
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Image Preview */}
                        {imagePreview && !cameraOpen && (
                            <div style={{ position: 'relative', marginBottom: 16, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <img src={imagePreview} alt="Captured" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block', borderRadius: 'var(--radius-md)' }} />
                                <button onClick={resetForm} style={{
                                    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                                    borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)',
                                    color: '#fff', cursor: 'pointer', fontSize: 12
                                }}>✕</button>
                            </div>
                        )}

                        {!imagePreview && !cameraOpen && (
                            <div className="image-upload-area" onClick={() => fileInputRef.current?.click()} style={{ marginBottom: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 48, marginBottom: 8 }}>🦟</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Capture or upload a photo for analysis</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Point camera at suspected breeding areas — drains, puddles, containers</div>
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Location *</label>
                            <input
                                type="text"
                                placeholder="e.g., Open drain near Block C, Sector 4A"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)', fontSize: 13,
                                    background: 'var(--surface-input)', fontFamily: 'var(--font-body)', outline: 'none'
                                }}
                            />
                        </div>

                        {/* Analyze Button */}
                        <button
                            className="btn btn-primary"
                            onClick={handleAnalyze}
                            disabled={analyzing || !capturedImage}
                            style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 14, fontWeight: 700 }}
                        >
                            {analyzing ? '🔬 Analyzing with ML Model...' : '🧠 Run Mosquito Detection AI'}
                        </button>
                    </div>
                </div>

                {/* Right — Analysis Result */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🧠 AI Analysis Result</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ML + Sensor Fusion</span>
                    </div>
                    <div className="card-body">
                        {analysisResult ? (
                            <div>
                                {/* ML Detection Result */}
                                <div style={{
                                    textAlign: 'center', padding: 24, borderRadius: 'var(--radius-md)',
                                    background: analysisResult.mlResult === 'DETECTED' ? 'rgba(244,67,54,0.08)' :
                                        analysisResult.mlResult === 'POTENTIAL_RISK' ? 'rgba(255,152,0,0.08)' : 'rgba(76,175,80,0.08)',
                                    marginBottom: 20
                                }}>
                                    <div style={{ fontSize: 48, marginBottom: 8 }}>
                                        {analysisResult.mlResult === 'DETECTED' ? '🦟' :
                                            analysisResult.mlResult === 'POTENTIAL_RISK' ? '⚠️' : '✅'}
                                    </div>
                                    <div style={{
                                        fontSize: 22, fontWeight: 800,
                                        color: analysisResult.mlResult === 'DETECTED' ? '#d32f2f' :
                                            analysisResult.mlResult === 'POTENTIAL_RISK' ? '#f57c00' : '#388e3c'
                                    }}>
                                        {analysisResult.mlResult === 'DETECTED' ? 'MOSQUITO DETECTED' :
                                            analysisResult.mlResult === 'POTENTIAL_RISK' ? 'POTENTIAL RISK' : 'NO MOSQUITO FOUND'}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                                        ML Confidence: <strong>{Math.round(analysisResult.confidence * 100)}%</strong>
                                    </div>
                                </div>

                                {/* Risk Score Gauge */}
                                {(() => {
                                    const risk = getRiskLevel(analysisResult.riskScore)
                                    return (
                                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                BREEDING RISK SCORE
                                            </div>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <svg viewBox="0 0 120 70" width="200">
                                                    {/* Background arc */}
                                                    <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e0e0e0" strokeWidth="10" strokeLinecap="round" />
                                                    {/* Filled arc */}
                                                    <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={risk.color} strokeWidth="10" strokeLinecap="round"
                                                        strokeDasharray={`${analysisResult.riskScore * 1.57} 157`} />
                                                    <text x="60" y="50" textAnchor="middle" fontSize="22" fontWeight="800" fill={risk.color}>
                                                        {analysisResult.riskScore}
                                                    </text>
                                                    <text x="60" y="62" textAnchor="middle" fontSize="8" fill="#999">/100</text>
                                                </svg>
                                            </div>
                                            <div style={{
                                                display: 'inline-block', padding: '4px 16px', borderRadius: 20,
                                                background: risk.bg, color: risk.color, fontWeight: 700, fontSize: 13
                                            }}>
                                                {risk.label} RISK
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Risk Factors Breakdown */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                        Risk Factor Breakdown
                                    </div>
                                    {[
                                        { label: '🧠 ML Analysis', value: analysisResult.riskFactors.mlScore, max: 35, color: '#e91e63' },
                                        { label: '💧 Stagnation', value: analysisResult.riskFactors.waterScore, max: 20, color: '#2196f3' },
                                        { label: '🛰️ Swarm Sensors', value: analysisResult.riskFactors.swarmScore, max: 35, color: '#ff9800' },
                                        { label: '🌡️ Environment', value: (analysisResult.riskFactors.gasScore || 0) + (analysisResult.riskFactors.historyScore || 0), max: 10, color: '#9c27b0' },
                                    ].map((factor, i) => (
                                        <div key={i} style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                                <span>{factor.label}</span>
                                                <span style={{ fontWeight: 700 }}>{factor.value}/{factor.max}</span>
                                            </div>
                                            <div style={{ height: 6, background: '#f0f4f8', borderRadius: 3 }}>
                                                <div style={{
                                                    height: '100%', width: `${(factor.value / factor.max) * 100}%`,
                                                    background: factor.color, borderRadius: 3, transition: 'width 0.5s ease'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Hardware Details */}
                                {analysisResult.hardwareStats && (
                                    <div style={{
                                        marginTop: 16, padding: 12, borderRadius: 'var(--radius-sm)',
                                        background: 'var(--surface-input)', border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                                            🛰️ Live Swarm Parameters
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
                                            <div style={{ color: analysisResult.hardwareStats.motion ? 'var(--gov-red)' : 'inherit' }}>
                                                <strong>Motion:</strong> {analysisResult.hardwareStats.motion ? '📡 ACTIVE' : 'NONE'}
                                            </div>
                                            <div>
                                                <strong>Sound:</strong> {analysisResult.hardwareStats.sound} <span style={{ fontSize: 9, opacity: 0.7 }}>(Buzz Index)</span>
                                            </div>
                                            <div>
                                                <strong>Humidity:</strong> {analysisResult.hardwareStats.humidity}%
                                            </div>
                                            <div>
                                                <strong>Temp:</strong> {analysisResult.hardwareStats.temp}°C
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Water stagnation warning */}
                                {analysisResult.waterStagnation && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.2)',
                                        fontSize: 12, color: '#1565c0', marginBottom: 12, marginTop: 12
                                    }}>
                                        🌊 <strong>Water stagnation detected</strong> — ideal breeding conditions for mosquitoes
                                    </div>
                                )}

                                {/* Action button */}
                                <button className="btn" onClick={resetForm} style={{
                                    width: '100%', justifyContent: 'center', marginTop: 8,
                                    background: 'var(--surface-input)', border: '1px solid var(--border-color)'
                                }}>
                                    🔄 Scan Another Area
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: 64, marginBottom: 12, opacity: 0.5 }}>🔬</div>
                                <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Awaiting Analysis</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
                                    Capture a photo of the suspected area. Our AI model will analyze it for mosquito
                                    presence and combine it with real-time **Sound, PIR, and DHT11** sensors to generate a swarm risk score.
                                </p>
                                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-input)', fontSize: 11, textAlign: 'left' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>📋 Fusion Logic (Swarms):</div>
                                    <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                        • Image → ML Detection (35%)<br />
                                        • Swarm Sensors → Sound + Motion (35%)<br />
                                        • Water sensor → Stagnation (20%)<br />
                                        • Environment → DHT11 + History (10%)
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Risk Zone Heatmap */}
            {riskZones.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">🗺️ Zone Risk Heatmap</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 7 days</span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {riskZones.map((zone, i) => {
                                const risk = getRiskLevel(zone.avgRisk)
                                return (
                                    <div key={i} style={{
                                        padding: 16, borderRadius: 'var(--radius-md)',
                                        background: risk.bg, border: `1px solid ${risk.color}30`,
                                        transition: 'transform 0.2s'
                                    }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: risk.color, marginBottom: 4 }}>
                                            {zone.zone}
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: risk.color }}>
                                            {zone.avgRisk}<span style={{ fontSize: 12, fontWeight: 500 }}>/100</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {zone.totalReports} scans · {zone.detectedCount} detections
                                        </div>
                                        <div style={{
                                            marginTop: 8, padding: '2px 8px', borderRadius: 10,
                                            background: risk.color, color: '#fff', fontSize: 10,
                                            fontWeight: 700, display: 'inline-block'
                                        }}>
                                            {risk.label}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Prevention Tips */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                    <h3 className="card-title">🛡️ Smart Prevention Tips</h3>
                </div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {[
                            { icon: '🚰', title: 'Drain Standing Water', desc: 'Empty flower pots, coolers, and containers weekly', priority: waterOverflow },
                            { icon: '🕸️', title: 'Install Mesh Screens', desc: 'Use wire mesh on windows and water tanks', priority: false },
                            { icon: '🧴', title: 'Use Larvicide', desc: 'Apply BTI tablets in water bodies that cannot be drained', priority: waterOverflow },
                            { icon: '🏗️', title: 'Report Drainage Issues', desc: 'Blocked drains create permanent breeding spots', priority: drainRisk },
                            { icon: '🔦', title: 'Inspect Dark Corners', desc: 'Check under staircases, behind furniture, garages', priority: false },
                            { icon: '📱', title: 'Scan Regularly', desc: 'Use this tool to monitor and report breeding areas', priority: true },
                        ].map((tip, i) => (
                            <div key={i} style={{
                                padding: 14, borderRadius: 'var(--radius-sm)',
                                background: tip.priority ? 'rgba(244,67,54,0.05)' : 'var(--surface-input)',
                                border: tip.priority ? '1px solid rgba(244,67,54,0.2)' : '1px solid var(--border-color)',
                                transition: 'transform 0.2s'
                            }}>
                                <div style={{ fontSize: 24, marginBottom: 6 }}>{tip.icon}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{tip.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tip.desc}</div>
                                {tip.priority && (
                                    <div style={{ marginTop: 6, fontSize: 10, color: '#d32f2f', fontWeight: 600 }}>⚡ PRIORITY ACTION</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Reports Table */}
            {reports.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">📋 Detection History</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{reports.length} scans</span>
                    </div>
                    <div className="card-body" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Location</th>
                                    <th>ML Result</th>
                                    <th>Confidence</th>
                                    <th>Risk Score</th>
                                    <th>Water</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.slice(0, 30).map((report, i) => {
                                    const risk = getRiskLevel(report.riskScore)
                                    return (
                                        <tr key={report._id || i}>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(report.createdAt).toLocaleDateString()}{' '}
                                                {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{report.location}</td>
                                            <td>
                                                <span className={`status-chip ${report.mlResult === 'DETECTED' ? 'critical' : report.mlResult === 'POTENTIAL_RISK' ? 'warning' : 'healthy'}`} style={{ fontSize: 10 }}>
                                                    {report.mlResult === 'DETECTED' ? '🦟 ' : ''}{report.mlResult}
                                                </span>
                                            </td>
                                            <td>{Math.round((report.confidence || 0) * 100)}%</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 40, height: 6, background: '#f0f4f8', borderRadius: 3 }}>
                                                        <div style={{
                                                            height: '100%', width: `${report.riskScore}%`,
                                                            background: risk.color, borderRadius: 3
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: risk.color }}>{report.riskScore}</span>
                                                </div>
                                            </td>
                                            <td>{report.waterStagnation ? '🌊 Yes' : '—'}</td>
                                            <td>
                                                <span className={`status-chip ${report.status === 'ACTION_TAKEN' ? 'healthy' : report.status === 'VERIFIED' ? 'warning' : 'critical'}`} style={{ fontSize: 10 }}>
                                                    {report.status}
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

            {/* No data state */}
            {reports.length === 0 && !analysisResult && (
                <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🦟</div>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No Detection Scans Yet</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        Use the camera above to scan areas for mosquito presence. The AI model will analyze the image
                        and combine it with sensor data for accurate risk assessment.
                    </p>
                </div>
            )}
        </div>
    )
}
