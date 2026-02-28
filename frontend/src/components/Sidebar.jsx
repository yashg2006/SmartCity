export default function Sidebar({ activePage, setActivePage, connected, alertCount, user, onLogout }) {
    const navItems = [
        { id: 'dashboard', icon: '📊', label: 'Overview', section: 'CORE' },
        { id: 'drainage', icon: '💧', label: 'Water Drainage', section: 'MONITORING' },
        { id: 'garbage', icon: '🗑️', label: 'Garbage Detection', section: null },
        { id: 'municipal', icon: '🏢', label: 'Field Operations', section: 'MANAGEMENT', badge: alertCount > 0 ? alertCount : null },
        { id: 'leaderboard', icon: '🏆', label: 'Citizen Rankings', section: null },
        { id: 'apidocs', icon: '📖', label: 'Technical Docs', section: 'DEVELOPER' },
    ]

    let currentSection = null

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-emblem">
                    <div className="sidebar-emblem-icon">🏛️</div>
                    <div>
                        <h1>URBAN<span style={{ color: 'var(--gov-saffron)' }}>PULSE</span></h1>
                        <p className="tagline">Smart Infrastructure Portal</p>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => {
                    const showSection = item.section && item.section !== currentSection
                    if (showSection) currentSection = item.section

                    return (
                        <div key={item.id}>
                            {showSection && (
                                <span className="nav-section-label">{item.section}</span>
                            )}
                            <button
                                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                                onClick={() => setActivePage(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                                {item.badge && (
                                    <span className="nav-badge">{item.badge}</span>
                                )}
                            </button>
                        </div>
                    )
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-status">
                    <span className="status-dot" style={{ background: connected ? '#4ade80' : '#f59e0b' }} />
                    {connected ? 'Live Network' : 'Awaiting Hardware'}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Digital India Initiative
                </div>
            </div>
        </aside>
    )
}
