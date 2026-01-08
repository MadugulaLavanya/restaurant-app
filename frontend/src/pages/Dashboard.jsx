import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

function Dashboard() {
    const [tables, setTables] = useState([])
    const [queue, setQueue] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        try {
            // Only set loading on initial fetch to avoid flickering
            if (tables.length === 0) setLoading(true)

            const [tablesRes, queueRes] = await Promise.all([
                fetch(`${API_BASE}/api/tables`),
                fetch(`${API_BASE}/api/queue`)
            ])

            if (!tablesRes.ok || !queueRes.ok) {
                throw new Error('Failed to fetch data')
            }

            const tablesData = await tablesRes.json()
            const queueData = await queueRes.json()

            setTables(tablesData)
            setQueue(queueData)
            setError(null)
        } catch (err) {
            setError(err.message)
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Initialize WebSocket for real-time updates
    useWebSocket(`${WS_BASE}/ws`, (message) => {
        console.log('WS Update received:', message)
        fetchData() // Refresh data on any update
    })

    useEffect(() => {
        fetchData()
    }, [])

    if (loading && tables.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ color: 'var(--danger)' }}>Error: {error}</div>
                <button className="btn" onClick={fetchData}>Retry</button>
            </div>
        )
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
                        <h1 className="title-gradient animate-fade-in" style={{ margin: 0, fontSize: '1.5rem' }}>Antigravity Restaurant</h1>
                    </Link>
                    <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="animate-fade-in">
                        <button className="btn btn-outline" onClick={fetchData} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            🔄 Refresh
                        </button>
                        <Link to="/staff" className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Staff Login</Link>
                    </nav>
                </div>
            </header>

            <main className="container animate-slide-up" style={{ padding: '2rem 1rem' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>Customer Dashboard</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Live floor plan and waitlist status</p>
                </div>

                {/* Table Grid */}
                <section style={{ marginBottom: '4rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🪑 Table Status <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'normal' }}>● Live</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
                        {tables.map((table, index) => (
                            <div key={table.id} className="card animate-fade-in" style={{
                                textAlign: 'center',
                                animationDelay: `${index * 0.05}s`,
                                borderBottom: `3px solid var(--${table.status === 'available' ? 'success' : table.status === 'occupied' ? 'danger' : 'warning'})`
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{table.number}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                                    {table.capacity} Seats
                                </div>
                                <span className={`status-badge status-${table.status}`} style={{ width: '100%', justifyContent: 'center' }}>
                                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Queue */}
                <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Current Waitlist</h3>
                        <span className="status-badge status-reserved">{queue.length} Groups Waiting</span>
                    </div>

                    {queue.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', borderStyle: 'dashed' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨</div>
                            No waiting customers. Walk right in!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {queue.map((customer, index) => (
                                <div key={customer.id} className="card list-item animate-fade-in" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    animationDelay: `${index * 0.1 + 0.5}s`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'var(--glass-bg)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '800',
                                            color: 'var(--accent-primary)',
                                            border: '1px solid var(--glass-border)'
                                        }}>
                                            {customer.position}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{customer.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Party of {customer.party_size}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-secondary)', letterSpacing: '-0.02em' }}>
                                            {customer.estimated_wait_time} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>min</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Predicted by AI</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default Dashboard
