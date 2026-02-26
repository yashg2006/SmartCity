export default function Toast({ title, body, type = 'success' }) {
    const icons = { success: '✅', warn: '⚠️', error: '❌', info: 'ℹ️' }
    const colors = { success: 'var(--gov-green)', warn: 'var(--gov-amber)', error: 'var(--gov-red)', info: 'var(--gov-blue)' }

    return (
        <div className="toast" style={{ borderLeftColor: colors[type] }}>
            <span className="toast-icon">{icons[type]}</span>
            <div>
                <div className="toast-title" style={{ color: colors[type] }}>{title}</div>
                {body && <div className="toast-body">{body}</div>}
            </div>
        </div>
    )
}
