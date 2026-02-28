import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from './config'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Leaderboard from './components/Leaderboard'
import MunicipalPortal from './components/MunicipalPortal'
import ApiDocs from './components/ApiDocs'
import BossAlert from './components/BossAlert'
import Toast from './components/Toast'
import Login from './components/Login'
import TopHeader from './components/TopHeader'
import WaterDrainage from './components/WaterDrainage'
import GarbageDetection from './components/GarbageDetection'

const socket = io(API_URL, { autoConnect: true })

const INITIAL_NODES = []

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
                    fetch(`${API_URL}/api/sensors/nodes`),
                    fetch(`${API_URL}/api/sensors/incidents`),
                    fetch(`${API_URL}/api/sensors/latest?isHardware=true`)
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
            fetch(`${API_URL}/api/sensors/incidents`)
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

    // No simulation — only real hardware data is used

    // Show login page if not authenticated
    if (!user) return <Login onLogin={handleLogin} />

    const alertCount = nodes.filter(n =>
        (n.drainDistance != null && n.drainDistance < 5) ||
        n.waterStatus === 'OVERFLOW' ||
        n.waterStatus === 'DRY' ||
        (n.distance > 0 && n.distance < 8)
    ).length

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard nodes={nodes} alerts={alerts} user={user} history={history} connected={connected} />
            case 'drainage': return <WaterDrainage nodes={nodes} history={history} connected={connected} />
            case 'garbage': return <GarbageDetection nodes={nodes} history={history} connected={connected} showToast={showToast} user={user} />
            case 'leaderboard': return <Leaderboard />
            case 'municipal': return <MunicipalPortal nodes={nodes} showToast={showToast} user={user} />
            case 'apidocs': return <ApiDocs />
            default: return <Dashboard nodes={nodes} alerts={alerts} user={user} history={history} connected={connected} />
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
