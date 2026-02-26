export default function TopHeader({ user, onLogout, connected }) {
    const date = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <header className="top-header">
            <div className="top-header-left">
                <span className="top-header-title">MUNICIPAL CORPORATION MONITORING SYSTEM</span>
                <span className="top-header-subtitle">| {date}</span>
            </div>

            <div className="top-header-right">
                <div className="sidebar-status" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    <span className="status-dot" style={{ background: connected ? '#4ade80' : '#f59e0b' }} />
                    {connected ? 'System Online' : 'Simulation Mode'}
                </div>

                <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

                <div className="user-chip">
                    <div className="user-avatar">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.name}</div>
                        <div className="user-role">{user?.role?.toUpperCase()} | {user?.area}</div>
                    </div>
                </div>

                <button className="btn btn-outline btn-sm" onClick={onLogout}>
                    Sign Out
                </button>
            </div>
        </header>
    )
}
