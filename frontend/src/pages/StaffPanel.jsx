import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

function StaffPanel() {
    const [tables, setTables] = useState([])
    const [insights, setInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(null)

    const fetchData = async () => {
        try {
            const [tablesRes, insightsRes] = await Promise.all([
                fetch(`${API_BASE}/api/tables`),
                fetch(`${API_BASE}/api/agents/status`)
            ])

            const tablesData = await tablesRes.json()
            const insightsData = await insightsRes.json()

            setTables(tablesData)
            setInsights(insightsData)
            setLoading(false)
        } catch (err) {
            console.error('Error fetching staff data:', err)
        }
    }

    // Initialize WebSocket for real-time updates
    useWebSocket(`${WS_BASE}/ws`, (message) => {
        console.log('WS Update received (Staff):', message)
        fetchData()
    })

    useEffect(() => {
        fetchData()
    }, [])

    const updateTableStatus = async (tableId, newStatus) => {
        setUpdating(tableId)
        try {
            const res = await fetch(`${API_BASE}/api/tables/${tableId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })

            if (res.ok) {
                // Agent cycle is triggered on backend, we'll get WS update
                await fetchData()
            }
        } catch (err) {
            console.error('Error updating table:', err)
        } finally {
            setUpdating(null)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Loading Staff Panel...</div>
            </div>
        )
    }

    // Check if a table is flagged as "stale" by the agent
    const getTableAlert = (tableId) => {
        return insights?.table_analysis?.alerts?.find(a => a.table_id === tableId)
    }

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
                        <h1 className="title-gradient animate-fade-in" style={{ margin: 0, fontSize: '1.5rem' }}>Antigravity Staff</h1>
                    </Link>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="animate-fade-in">
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                background: 'var(--success)',
                                borderRadius: '50%',
                                boxShadow: '0 0 10px var(--success)',
                                animation: 'pulse-red 2s infinite' /* Reuse pulse but green */
                            }}></span>
                            Live Sync Active
                        </div>
                        <Link to="/staff" className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Logout</Link>
                    </div>
                </div>
            </header>

            <main className="container animate-slide-up" style={{ padding: '2rem 1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem' }}>

                {/* Tables Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>Table Management</h2>
                        <button className="btn btn-outline" onClick={fetchData} style={{ padding: '0.5rem 1rem' }}>🔄 Force Reload</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                        {tables.map((table, index) => {
                            const alert = getTableAlert(table.id);
                            return (
                                <div key={table.id}
                                    className={`card animate-fade-in ${alert ? 'card-pulse-red' : ''}`}
                                    style={{
                                        animationDelay: `${index * 0.05}s`,
                                        opacity: updating === table.id ? 0.6 : 1,
                                        border: alert ? '1.5px solid var(--danger)' : '1px solid var(--glass-border)',
                                        position: 'relative'
                                    }}>
                                    {alert && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: '-10px',
                                            background: 'var(--danger)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            zIndex: 5,
                                            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)'
                                        }}>
                                            STALE
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{table.number}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Capacity: {table.capacity}</div>
                                        </div>
                                        <span className={`status-badge status-${table.status}`} style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => updateTableStatus(table.id, 'available')}
                                            disabled={updating === table.id}
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                fontSize: '0.875rem',
                                                background: table.status === 'available' ? 'var(--success)' : 'transparent',
                                                border: `1px solid ${table.status === 'available' ? 'var(--success)' : 'rgba(16, 185, 129, 0.3)'}`,
                                                color: table.status === 'available' ? 'white' : 'var(--success)',
                                                cursor: updating === table.id ? 'wait' : 'pointer'
                                            }}
                                        >
                                            Available
                                        </button>
                                        <button
                                            onClick={() => updateTableStatus(table.id, 'occupied')}
                                            disabled={updating === table.id}
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                fontSize: '0.875rem',
                                                background: table.status === 'occupied' ? 'var(--danger)' : 'transparent',
                                                border: `1px solid ${table.status === 'occupied' ? 'var(--danger)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                color: table.status === 'occupied' ? 'white' : 'var(--danger)',
                                                cursor: updating === table.id ? 'wait' : 'pointer'
                                            }}
                                        >
                                            Occupied
                                        </button>
                                        <button
                                            onClick={() => updateTableStatus(table.id, 'reserved')}
                                            disabled={updating === table.id}
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                fontSize: '0.875rem',
                                                background: table.status === 'reserved' ? 'var(--warning)' : 'transparent',
                                                border: `1px solid ${table.status === 'reserved' ? 'var(--warning)' : 'rgba(245, 158, 11, 0.3)'}`,
                                                color: table.status === 'reserved' ? 'white' : 'var(--warning)',
                                                cursor: updating === table.id ? 'wait' : 'pointer'
                                            }}
                                        >
                                            Reserved
                                        </button>
                                    </div>

                                    {alert && (
                                        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '500', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                                            ⚠️ {alert.message}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Agent Insights Sidebar */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent-primary)', position: 'sticky', top: '100px' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
                            <span style={{ fontSize: '1.5rem' }}>🤖</span> Agent Hub
                        </h3>

                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                    {insights?.environment_summary?.available_tables}
                                </div>
                            </div>
                            <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Waiting</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                                    {insights?.environment_summary?.queue_length}
                                </div>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Recommendations</h4>
                            {insights?.table_analysis?.recommendations?.length > 0 ? (
                                insights.table_analysis.recommendations.map((rec, i) => (
                                    <div key={i} className="list-item" style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                        💡 {rec.message}
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>Scanning for optimizations...</div>
                            )}
                        </div>

                        {/* Recent Activity / Notifications */}
                        <div>
                            <h4 style={{ fontSize: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-time Trace</h4>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                                {insights?.notification_analysis?.notifications_sent?.length > 0 ? (
                                    insights.notification_analysis.notifications_sent.slice().reverse().map((notif, i) => (
                                        <div key={i} className="list-item" style={{
                                            padding: '0.65rem',
                                            fontSize: '0.75rem',
                                            background: 'var(--bg-primary)',
                                            borderRadius: '6px',
                                            border: '1px solid var(--glass-border)',
                                            borderLeft: `3px solid ${notif.type === 'staff_alert' ? 'var(--danger)' : 'var(--success)'}`
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: notif.type === 'staff_alert' ? 'var(--danger)' : 'var(--success)', fontSize: '0.6rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                                {notif.type === 'staff_alert' ? 'Critical Alert' : 'System Action'}
                                            </div>
                                            {notif.message}
                                        </div>
                                    ))
                                ) : (
                                    <div className="shimmer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', borderRadius: '8px' }}>
                                        Monitoring environment...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    )
}


export default StaffPanel
