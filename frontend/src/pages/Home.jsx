import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

function Home() {
    const [stats, setStats] = useState({
        availableTables: 0,
        totalTables: 0,
        queueLength: 0,
        avgWaitTime: 0
    })

    const fetchStats = async () => {
        try {
            const [tablesRes, queueRes] = await Promise.all([
                fetch(`${API_BASE}/api/tables`),
                fetch(`${API_BASE}/api/queue`)
            ])

            const tables = await tablesRes.json()
            const queue = await queueRes.json()

            const available = tables.filter(t => t.status === 'available').length
            const avgWait = queue.length > 0
                ? Math.round(queue.reduce((sum, q) => sum + q.estimated_wait_time, 0) / queue.length)
                : 0

            setStats({
                availableTables: available,
                totalTables: tables.length,
                queueLength: queue.length,
                avgWaitTime: avgWait
            })
        } catch (err) {
            console.error('Error fetching stats:', err)
        }
    }

    // Initialize WebSocket for real-time updates
    useWebSocket(`${WS_BASE}/ws`, (message) => {
        console.log('WS Update received (Home):', message)
        fetchStats()
    })

    useEffect(() => {
        fetchStats()
    }, [])

    return (
        <div className="app-container">
            <header style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <h1 className="title-gradient animate-fade-in" style={{ fontSize: '4rem', margin: 0 }}>
                    Antigravity Restaurant
                </h1>
                <p className="animate-fade-in" style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '0.5rem', opacity: 0.8 }}>
                    Autonomous AI Operations Dashboard
                </p>
            </header>

            <main className="container" style={{ padding: '0 1rem 4rem' }}>
                <section className="card animate-slide-up" style={{ textAlign: 'center', padding: '4rem 2rem', marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Smart Table Management</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        Autonomous agent-driven queue and table tracking system.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/status" className="btn" style={{ background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-glow))' }}>Check My Status</Link>
                        <Link to="/dashboard" className="btn">General Dashboard</Link>
                        <Link to="/manager" className="btn btn-outline" style={{ borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' }}>Manager Analytics</Link>
                        <Link to="/staff" className="btn btn-outline">Staff Login</Link>
                    </div>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Live Stats */}
                    <div className="card animate-fade-in" style={{ animationDelay: '0.2s', textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available Tables</h3>
                        <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--success)', margin: '1rem 0' }}>
                            {stats.availableTables}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/{stats.totalTables}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>● Sensed by TableAgent</p>
                    </div>

                    <div className="card animate-fade-in" style={{ animationDelay: '0.3s', textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Wait Time</h3>
                        <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--accent-secondary)', margin: '1rem 0' }}>
                            {stats.avgWaitTime}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>min</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>● Calculated by ETAAgent</p>
                    </div>

                    <div className="card animate-fade-in" style={{ animationDelay: '0.4s', textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>System Status</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <span className="status-badge status-available">🤖 Agents Active</span>
                            <span className="status-badge status-reserved">📡 Live Sync</span>
                            <span className="status-badge status-occupied">🔒 Secure</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>All systems operational</p>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Home
