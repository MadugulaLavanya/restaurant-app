import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

function ManagerDashboard() {
    const [insights, setInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/agents/status`)
            if (!res.ok) throw new Error('Failed to fetch analytics')
            const data = await res.json()
            setInsights(data)
            setLoading(false)
        } catch (err) {
            setError(err.message)
            console.error('Analytics Fetch Error:', err)
        }
    }

    useWebSocket(`${WS_BASE}/ws`, () => {
        fetchAnalytics()
    })

    useEffect(() => {
        fetchAnalytics()
    }, [])

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Manager Dashboard...</div>
    if (error) return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

    const metrics = insights?.analytics_analysis?.metrics || []
    const agentInsights = insights?.analytics_analysis?.insights || []

    return (
        <div className="app-container">
            <header style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1 className="title-gradient animate-fade-in" style={{ margin: 0, fontSize: '1.5rem' }}>Antigravity Manager</h1>
                    </Link>
                    <nav style={{ display: 'flex', gap: '1rem' }} className="animate-fade-in">
                        <Link to="/staff/panel" className="btn btn-outline" style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}>Staff Panel</Link>
                        <Link to="/" className="btn btn-outline" style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}>Logout</Link>
                    </nav>
                </div>
            </header>

            <main className="container animate-slide-up" style={{ padding: '2rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', margin: 0 }}>Operational Analytics</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>Real-time performance metrics computed by AnalyticsAgent</p>
                    </div>
                    <div className="status-badge status-available animate-fade-in" style={{ padding: '0.5rem 1rem', boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)' }}>
                        📡 Live Feed Active
                    </div>
                </div>

                {/* Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3.rem' }}>
                    {metrics.map((m, i) => (
                        <div key={i} className="card" style={{ borderTop: `4px solid var(--accent-primary)` }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: 0 }}>
                                {m.type.replace(/_/g, ' ')}
                            </h3>
                            <div style={{ fontSize: '3.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
                                {m.value}{m.type.includes('rate') ? '%' : m.type.includes('time') ? 'm' : ''}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                                ● Live calculation by AnalyticsAgent
                            </div>
                        </div>
                    ))}

                    <div className="card" style={{ borderTop: `4px solid var(--success)` }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: 0 }}>
                            System Efficiency
                        </h3>
                        <div style={{ fontSize: '3.5rem', fontWeight: '800', margin: '0.5rem 0', color: 'var(--success)' }}>
                            Optimal
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on Agent turnover predictions</p>
                    </div>
                </div>

                {/* Insights & Warnings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem' }}>
                    <section>
                        <h3 style={{ marginBottom: '1rem' }}>🤖 Agent Recommendations</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {agentInsights.length > 0 ? agentInsights.map((ins, i) => (
                                <div key={i} className="card" style={{
                                    background: ins.type === 'peak_warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                    borderColor: ins.type === 'peak_warning' ? 'var(--warning)' : 'var(--accent-primary)'
                                }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: ins.type === 'peak_warning' ? 'var(--warning)' : 'var(--text-primary)' }}>
                                        {ins.type === 'peak_warning' ? '⚠️ CAPACITY WARNING' : 'ℹ️ EFFICIENCY TIP'}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{ins.message}</p>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--text-muted)' }}>All clear. No urgent insights from agents.</p>
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 style={{ marginBottom: '1rem' }}>📈 Performance Overview</h3>
                        <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem' }}>📊</div>
                                <p style={{ color: 'var(--text-muted)' }}>Historical charts coming soon (v2.0)</p>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                    AnalyticsAgent is currently recording {metrics.length} data points to the database.
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

export default ManagerDashboard
