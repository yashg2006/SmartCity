import { useState } from 'react'

const ROLE_LABELS = { admin: 'Administrator', municipal: 'Municipal Officer', citizen: 'Citizen' }
const DEMO_ACCOUNTS = [
    { email: 'admin@urbanpulse.gov', label: 'Admin', role: 'admin' },
    { email: 'officer@urbanpulse.gov', label: 'Officer', role: 'municipal' },
    { email: 'arjun@citizen.urbanpulse', label: 'Citizen', role: 'citizen' },
]

export default function Login({ onLogin }) {
    const [mode, setMode] = useState('login')   // 'login' | 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '', area: 'Sector 4A' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
            const body = mode === 'login'
                ? { email: form.email, password: form.password }
                : { name: form.name, email: form.email, password: form.password, area: form.area, role: 'citizen' }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Authentication failed')
                return
            }

            localStorage.setItem('up_token', data.token)
            localStorage.setItem('up_user', JSON.stringify(data.user))
            onLogin(data.user)
        } catch {
            // Offline demo mode — allow pre-seeded accounts
            const demoMap = {
                'admin@urbanpulse.gov': { id: '1', name: 'Admin User', email: 'admin@urbanpulse.gov', role: 'admin', area: 'HQ' },
                'officer@urbanpulse.gov': { id: '2', name: 'Municipal Officer', email: 'officer@urbanpulse.gov', role: 'municipal', area: 'Sector 4A' },
                'arjun@citizen.urbanpulse': { id: '3', name: 'Arjun Sharma', email: 'arjun@citizen.urbanpulse', role: 'citizen', area: 'Sector 4A' },
            }
            const demoUser = demoMap[form.email.toLowerCase()]
            if (demoUser && form.password === 'admin123') {
                localStorage.setItem('up_token', 'demo-token')
                localStorage.setItem('up_user', JSON.stringify(demoUser))
                onLogin(demoUser)
            } else {
                setError('Backend offline. Use demo accounts: password admin123')
            }
        } finally {
            setLoading(false)
        }
    }

    const fillDemo = (account) => {
        setForm(f => ({ ...f, email: account.email, password: 'admin123' }))
        setMode('login')
        setError('')
    }

    return (
        <div className="login-page" style={{ '--login-bg': `url('/smart_city_bg.png')` }}>
            <div className="login-container">

                {/* Government Header */}
                <div className="login-gov-header">
                    <div className="login-emblem">🏛️</div>
                    <div className="login-gov-name">Government of India</div>
                    <div className="login-gov-subtitle">Smart City Mission · Municipal Corporation Portal</div>
                </div>

                <div className="login-card">
                    <div className="login-card-header">
                        <div className="login-card-title">
                            {mode === 'login' ? '🔐 Officer / Citizen Login' : '📝 New Citizen Registration'}
                        </div>
                    </div>

                    <div className="login-card-body">
                        {/* Demo accounts */}
                        {mode === 'login' && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Quick Demo Access
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {DEMO_ACCOUNTS.map(a => (
                                        <button
                                            key={a.email}
                                            type="button"
                                            onClick={() => fillDemo(a)}
                                            style={{
                                                padding: '5px 12px',
                                                background: 'var(--gov-blue-light)',
                                                border: '1px solid #93c5fd',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: 'var(--gov-blue)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                                    All demo accounts use password: <strong>admin123</strong>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {mode === 'register' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Full Name *</label>
                                        <input className="form-input" type="text" placeholder="Enter your full name"
                                            value={form.name} onChange={e => set('name', e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Zone / Area</label>
                                        <select className="form-input" value={form.area} onChange={e => set('area', e.target.value)}>
                                            {['Sector 1A', 'Sector 2C', 'Sector 3F', 'Sector 4A', 'Sector 6E', 'Sector 7B', 'Sector 8G', 'Sector 9D'].map(z => (
                                                <option key={z} value={z}>{z}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Email Address *</label>
                                <input className="form-input" type="email" placeholder="Enter your email"
                                    value={form.email} onChange={e => set('email', e.target.value)} required autoComplete="email" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <input className="form-input" type="password" placeholder="Enter your password"
                                    value={form.password} onChange={e => set('password', e.target.value)} required autoComplete="current-password" />
                            </div>

                            {error && (
                                <div className="form-error">
                                    ⚠️ {error}
                                </div>
                            )}

                            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: 14 }}>
                                {loading ? '⏳ Please wait...' : mode === 'login' ? 'Login to Portal' : 'Create Account'}
                            </button>
                        </form>

                        <div className="login-divider">or</div>

                        <div style={{ textAlign: 'center' }}>
                            {mode === 'login' ? (
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    New citizen?{' '}
                                    <span className="login-footer" style={{ display: 'inline' }}>
                                        <a onClick={() => { setMode('register'); setError('') }}>Register here</a>
                                    </span>
                                </span>
                            ) : (
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Already registered?{' '}
                                    <span className="login-footer" style={{ display: 'inline' }}>
                                        <a onClick={() => { setMode('login'); setError('') }}>Login</a>
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="login-card-footer">
                        🔒 Secured portal · {new Date().getFullYear()} © Smart City Mission
                    </div>
                </div>
            </div>
        </div>
    )
}
