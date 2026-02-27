import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Leaderboard from './components/Leaderboard'
import MunicipalPortal from './components/MunicipalPortal'
import ApiDocs from './components/ApiDocs'
import BossAlert from './components/BossAlert'
import Toast from './components/Toast'
import Login from './components/Login'
import TopHeader from './components/TopHeader'

const socket = io('http://localhost:5000', { autoConnect: true })

const INITIAL_NODES = [
    { nodeId: 'NODE-001', zone: 'Sector 4A', lat: 12.9716, lng: 77.5946, distance: 42, gasLevel: 380, waterStatus: 'NORMAL', batteryLevel: 87 },
    { nodeId: 'NODE-002', zone: 'Sector 7B', lat: 12.9785, lng: 77.6408, distance: 78, gasLevel: 1200, waterStatus: 'NORMAL', batteryLevel: 73 },
    { nodeId: 'NODE-003', zone: 'Sector 2C', lat: 12.9352, lng: 77.6146, distance: 91, gasLevel: 2450, waterStatus: 'OVERFLOW', batteryLevel: 62 },
    { nodeId: 'NODE-004', zone: 'Sector 9D', lat: 13.0012, lng: 77.5953, distance: 25, gasLevel: 520, waterStatus: 'NORMAL', batteryLevel: 91 },
    { nodeId: 'NODE-005', zone: 'Sector 3F', lat: 12.9565, lng: 77.7011, distance: 56, gasLevel: 880, waterStatus: 'NORMAL', batteryLevel: 78 },
]

// ── Restore auth from localStorage ────────────────────────
function getStoredUser() {
    try {
        const u = localStorage.getItem('up_user')
        return u ? JSON.parse(u) : null
    } catch { return null }
}

export default function App() {
    const [user, setUser] = useState(getStoredUser)   // null = not logged in
    const [activePage, setActivePage] = useState('dashboard')
    const [nodes, setNodes] = useState(INITIAL_NODES)
    const [incidents, setIncidents] = useState([])
    const [alerts, setAlerts] = useState([])
    const [bossAlert, setBossAlert] = useState(null)
    const [toast, setToast] = useState(null)
    const [connected, setConnected] = useState(false)
    const [history, setHistory] = useState([])

    const showToast = useCallback((title, body, type = 'success') => {
        setToast({ title, body, type })
        setTimeout(() => setToast(null), 4000)
    }, [])

    const handleLogin = (loggedInUser) => {
        setUser(loggedInUser)
        showToast(`Welcome, ${loggedInUser.name}!`, `Logged in as ${loggedInUser.role}`, 'success')
    }

    const handleLogout = () => {
        localStorage.removeItem('up_token')
        localStorage.removeItem('up_user')
        setUser(null)
        setActivePage('dashboard')
    }

    // Fetch initial nodes, incidents, and history
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [nRes, iRes, hRes] = await Promise.all([
                    fetch('http://localhost:5000/api/sensors/nodes'),
                    fetch('http://localhost:5000/api/sensors/incidents'),
                    fetch('http://localhost:5000/api/sensors/latest?isHardware=true')
                ]);
                const nodesData = await nRes.json();
                const incidentsData = await iRes.json();
                const historyData = await hRes.json();
                if (nodesData.length > 0) setNodes(nodesData);
                setIncidents(incidentsData);
                setHistory(historyData);
            } catch (err) { console.error('Failed to fetch data', err); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        socket.on('connect', () => setConnected(true))
        socket.on('disconnect', () => setConnected(false))

        socket.on('sensor:update', (data) => {
            setNodes(prev => {
                const idx = prev.findIndex(n => n.nodeId === data.nodeId)
                if (idx >= 0) {
                    const updated = [...prev]
                    updated[idx] = { ...updated[idx], ...data }
                    return updated
                }
                return [...prev, data]
            })

            // Update history if it's hardware data
            if (data.isHardware) {
                setHistory(prev => [data, ...prev].slice(0, 50))
            }
        })

        socket.on('sensor:alert', (data) => {
            setBossAlert(data)
            setAlerts(prev => [data, ...prev].slice(0, 20))
            // Refresh incidents when a new alert is received
            fetch('http://localhost:5000/api/sensors/incidents')
                .then(r => r.json())
                .then(data => setIncidents(data))
        })

        socket.on('incident:update', (updatedIncident) => {
            setIncidents(prev => {
                const idx = prev.findIndex(i => i._id === updatedIncident._id)
                if (updatedIncident.status === 'RESOLVED') {
                    return prev.filter(i => i._id !== updatedIncident._id)
                }
                if (idx >= 0) {
                    const next = [...prev]
                    next[idx] = updatedIncident
                    return next
                }
                return [updatedIncident, ...prev]
            })
        })

        return () => socket.off()
    }, [])

    // Local simulation for offline mode
    useEffect(() => {
        const interval = setInterval(() => {
            if (!connected) {
                setNodes(prev => prev.map(node => ({
                    ...node,
                    distance: Math.min(100, Math.max(5, node.distance + (Math.random() - 0.48) * 4)),
                    gasLevel: Math.max(100, node.gasLevel + (Math.random() - 0.45) * 70),
                    batteryLevel: Math.max(10, node.batteryLevel - Math.random() * 0.03)
                })))
            }
        }, 2500)
        return () => clearInterval(interval)
    }, [connected])

    // Show login page if not authenticated
    if (!user) return <Login onLogin={handleLogin} />

    const alertCount = nodes.filter(n => n.gasLevel > 2200 || (n.drainDistance && n.drainDistance > 50) || n.waterStatus === 'OVERFLOW').length

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard nodes={nodes} alerts={alerts} user={user} history={history} />
            case 'leaderboard': return <Leaderboard />
            case 'municipal': return <MunicipalPortal nodes={nodes} showToast={showToast} user={user} />
            case 'apidocs': return <ApiDocs />
            default: return <Dashboard nodes={nodes} alerts={alerts} user={user} history={history} />
        }
    }

    return (
        <div className="app-layout">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                connected={connected}
                alertCount={alertCount}
                user={user}
                onLogout={handleLogout}
            />
            <div className="main-content">
                <TopHeader user={user} onLogout={handleLogout} connected={connected} />
                <div className="page-body">
                    {renderPage()}
                </div>
            </div>

            {bossAlert && <BossAlert alert={bossAlert} onClose={() => setBossAlert(null)} />}
            {toast && <Toast {...toast} />}
        </div>
    )
}
