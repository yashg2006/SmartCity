export default function XpBar({ label, value, max = 100, startColor, endColor }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div className="xp-bar-container">
            <div className="xp-bar-header">
                <span className="xp-bar-label">{label}</span>
                <span className="xp-bar-value">{Math.round(pct)}%</span>
            </div>
            <div className="xp-bar-track">
                <div
                    className="xp-bar-fill"
                    style={{
                        width: `${pct}%`,
                        '--bar-start': startColor || 'var(--gov-blue)',
                        '--bar-end': endColor || 'var(--gov-blue-mid)',
                    }}
                />
            </div>
        </div>
    )
}
