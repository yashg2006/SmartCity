import { useState } from 'react'
import SensorMap from './SensorMap'

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

const PIPE_DEPTH = 30
const BIN_DEPTH = 50

export default function Dashboard({ nodes, alerts, user, incidents = [], history = [], connected }) {
    const [selectedBlog, setSelectedBlog] = useState(null)

    const blogContent = {
        'waste-segregation': {
            title: 'The Art of Smart Segregation',
            category: 'Waste Management',
            image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
            text: 'Smart segregation is the practice of separating waste at the source using IoT-enabled classification. Our UrbanPulse sensors detect the type of waste being deposited and alert the processing facility in real-time. By segmenting paper, plastics, and bio-waste immediately, we increase recycling efficiency by over 40%.'
        },
        'drainage-monitoring': {
            title: 'Predictive Drainage Monitoring',
            category: 'Infrastructure',
            image: 'https://images.pexels.com/photos/190417/pexels-photo-190417.jpeg?auto=compress&cs=tinysrgb&w=800',
            text: 'Traditional drainage systems rely on manual reporting. UrbanPulse utilizes ultrasonic pulse sensors that map the internal fluid dynamics of city channels. We can predict a blockage 12 hours before a flood occurs, allowing municipal crews to act proactively rather than reactively.'
        },
        'green-corridors': {
            title: 'Building Blue-Green Corridors',
            category: 'Sustainability',
            image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80',
            text: 'Blue-Green corridors are vital arteries for modern urban life. These areas combine water management (Blue) with ecological planting (Green) to reduce the heat-island effect. UrbanPulse monitors the temperature and humidity of these corridors to ensure they remain at optimal cooling levels for the city.'
        }
    }

    // Find active hardware node
    const activeNode = nodes.find(n => n.zone === 'Sector 4A' || n.nodeId === 'NODE-001') || null

    // Drainage summary
    const drainDistance = activeNode?.drainDistance
    const waterLevel = drainDistance != null ? Math.max(0, PIPE_DEPTH - drainDistance) : null
    const flowStatus = activeNode?.waterStatus === 'DRY' ? 'No Flow' : activeNode?.waterStatus === 'OVERFLOW' ? 'Overflow!' : activeNode ? 'Flowing' : 'Offline'

    // Bin summary
    const binDistance = activeNode?.distance
    const binFillPct = binDistance != null && binDistance > 0 ? Math.max(0, Math.min(100, Math.round(((BIN_DEPTH - binDistance) / BIN_DEPTH) * 100))) : null

    const totalNodes = nodes.length
    const criticalCount = incidents.length

    return (
        <div>
            <div className="breadcrumb">
                <span>Home</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">System Overview</span>
            </div>

            <div className="page-header">
                <div>
                    <h2 className="page-title">Operational Overview</h2>
                    <p className="page-subtitle">Department of Urban Planning · Live Infrastructure Status</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {connected ? (
                        <span className="status-chip live">● LIVE SYSTEM</span>
                    ) : (
                        <span className="status-chip warning">⏳ AWAITING HARDWARE</span>
                    )}
                    {criticalCount > 0 && (
                        <span className="status-chip critical">⚠ {criticalCount} ALERTS</span>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    label="Active Sensors"
                    value={totalNodes}
                    icon="📡"
                    accent="var(--gov-blue)"
                    trend={{ text: totalNodes > 0 ? 'Hardware connected' : 'No sensors', dir: totalNodes > 0 ? 'up' : '' }}
                />
                <StatCard
                    label="Water Flow"
                    value={flowStatus}
                    icon="💧"
                    accent={flowStatus === 'No Flow' ? 'var(--gov-red)' : flowStatus === 'Overflow!' ? 'var(--gov-red)' : 'var(--gov-green)'}
                    trend={{ text: waterLevel != null ? `Level: ${waterLevel}cm` : 'No data', dir: flowStatus === 'Flowing' ? 'up' : 'down' }}
                />
                <StatCard
                    label="Bin Fill Level"
                    value={binFillPct != null ? binFillPct : '—'}
                    unit={binFillPct != null ? '%' : ''}
                    icon="🗑️"
                    accent={binFillPct != null ? (binFillPct > 85 ? 'var(--gov-red)' : binFillPct > 65 ? 'var(--gov-amber)' : 'var(--gov-green)') : 'var(--text-muted)'}
                    trend={{ text: binFillPct != null ? (binFillPct > 85 ? 'Overflow risk!' : 'Normal') : 'No data', dir: binFillPct > 85 ? 'down' : 'up' }}
                />
                <StatCard
                    label="Active Alerts"
                    value={criticalCount}
                    icon="🚨"
                    accent={criticalCount > 0 ? 'var(--gov-red)' : 'var(--gov-green)'}
                    trend={{ text: criticalCount > 0 ? 'Attention needed' : 'All clear', dir: criticalCount > 0 ? 'down' : 'up' }}
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
                        <h3 className="card-title">⚡ System Status</h3>
                    </div>
                    <div className="card-body">
                        {activeNode ? (
                            <div>
                                <div style={{ marginBottom: 20, padding: 16, borderRadius: 'var(--radius-md)', background: '#f1f8e9', border: '1px solid #dcedc8' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gov-blue)' }}>{activeNode.nodeId} · {activeNode.zone}</span>
                                        {activeNode.isHardware && (
                                            <span style={{ fontSize: 9, fontWeight: 800, color: '#4ade80', letterSpacing: '0.05em' }}>⚡ REAL-TIME HARDWARE</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>💧 Water:</span>{' '}
                                            <strong style={{ color: activeNode.waterStatus === 'DRY' ? 'var(--gov-red)' : 'var(--gov-green)' }}>
                                                {activeNode.waterStatus}
                                            </strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>📏 Drain Dist:</span>{' '}
                                            <strong>{activeNode.drainDistance ?? 'N/A'} cm</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>🗑️ Bin Dist:</span>{' '}
                                            <strong>{activeNode.distance} cm</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>🔋 Battery:</span>{' '}
                                            <strong>{Math.round(activeNode.batteryLevel)}%</strong>
                                        </div>
                                    </div>
                                    {activeNode.timestamp && (
                                        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                                            Last synced: {new Date(activeNode.timestamp).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                {/* Quick navigation */}
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 16 }}>
                                    <strong>Quick Navigation:</strong>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <span style={{ padding: '6px 12px', background: '#e3f2fd', borderRadius: 'var(--radius-sm)', cursor: 'default', fontSize: 11, fontWeight: 600 }}>
                                            💧 Water Drainage → Sidebar
                                        </span>
                                        <span style={{ padding: '6px 12px', background: '#fff3e0', borderRadius: 'var(--radius-sm)', cursor: 'default', fontSize: 11, fontWeight: 600 }}>
                                            🗑️ Garbage Detection → Sidebar
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                                <h4 style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>No Hardware Connected</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Connect your ESP32 sensors to see real-time data here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Awareness Blog --- */}
            <div className="card" style={{ marginTop: 24, border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <div className="page-header" style={{ marginBottom: 16, borderBottom: 'none', paddingBottom: 0 }}>
                    <div>
                        <h2 className="page-title" style={{ fontSize: 18 }}>🌱 Community Awareness</h2>
                        <p className="page-subtitle">Educational Insights for a Sustainable Future</p>
                    </div>
                </div>

                <div className="blog-grid">
                    <div className="blog-card" onClick={() => setSelectedBlog('waste-segregation')}>
                        <img
                            src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80"
                            alt="Smart Waste"
                            className="blog-card-img"
                        />
                        <div className="blog-card-body">
                            <span className="blog-category">Waste Management</span>
                            <h4 className="blog-title">The Art of Smart Segregation</h4>
                            <p className="blog-text">Discover how IoT-enabled bins are revolutionizing city cleanliness by identifying waste types in real-time.</p>
                            <span className="blog-link">Read full insight →</span>
                        </div>
                    </div>

                    <div className="blog-card" onClick={() => setSelectedBlog('drainage-monitoring')}>
                        <img
                            src="https://images.pexels.com/photos/190417/pexels-photo-190417.jpeg?auto=compress&cs=tinysrgb&w=800"
                            alt="Urban Drainage"
                            className="blog-card-img"
                        />
                        <div className="blog-card-body">
                            <span className="blog-category">Infrastructure</span>
                            <h4 className="blog-title">Predictive Drainage Monitoring</h4>
                            <p className="blog-text">How our ultrasonic network prevents urban flooding by identifying blockages faster than manual checks.</p>
                            <span className="blog-link">View tech specs →</span>
                        </div>
                    </div>

                    <div className="blog-card" onClick={() => setSelectedBlog('green-corridors')}>
                        <img
                            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80"
                            alt="Sustainable City"
                            className="blog-card-img"
                        />
                        <div className="blog-card-body">
                            <span className="blog-category">Sustainability</span>
                            <h4 className="blog-title">Building Blue-Green Corridors</h4>
                            <p className="blog-text">Why mapping our city's vital signs is the first step toward achieving a 100% net-zero urban ecosystem by 2030.</p>
                            <span className="blog-link">Join the movement →</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Blog Modal Overlay --- */}
            {selectedBlog && (
                <div className="blog-modal-overlay" onClick={() => setSelectedBlog(null)}>
                    <div className="blog-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="blog-modal-close" onClick={() => setSelectedBlog(null)}>&times;</button>
                        <img src={blogContent[selectedBlog].image} alt="" style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                        <div style={{ padding: '30px' }}>
                            <span className="blog-category">{blogContent[selectedBlog].category}</span>
                            <h2 style={{ fontSize: '24px', margin: '10px 0 20px', color: 'var(--text-primary)' }}>{blogContent[selectedBlog].title}</h2>
                            <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '15px' }}>
                                {blogContent[selectedBlog].text}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
