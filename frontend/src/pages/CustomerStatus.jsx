import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

function CustomerStatus() {
    const [phone, setPhone] = useState('')
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isSearching, setIsSearching] = useState(true)

    const fetchStatus = async (searchPhone = phone) => {
        if (!searchPhone) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_BASE}/api/queue/status/${searchPhone}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error('We couldn\'t find a queue entry for this phone number.')
                throw new Error('Failed to fetch status')
            }
            const data = await res.json()
            setCustomer(data)
            setIsSearching(false)
        } catch (err) {
            setError(err.message)
            setCustomer(null)
        } finally {
            setLoading(false)
        }
    }

    useWebSocket(`${WS_BASE}/ws`, () => {
        if (customer) {
            fetchStatus(customer.phone)
        }
    })

    const handleSearch = (e) => {
        e.preventDefault()
        fetchStatus()
    }

    const handleReset = () => {
        setCustomer(null)
        setIsSearching(true)
        setPhone('')
        setError(null)
    }

    if (isSearching) {
        return (
            <div className="app-container">
                <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div className="container">
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <h1 className="title-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Antigravity Restaurant</h1>
                        </Link>
                    </div>
                </header>

                <main className="container" style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
                        <h2 style={{ marginBottom: '1rem' }}>Check Your Wait Status</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Enter the phone number you used to join the queue.
                        </p>
                        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="tel"
                                placeholder="e.g. 555-0123"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    textAlign: 'center'
                                }}
                                required
                            />
                            <button type="submit" className="btn" disabled={loading}>
                                {loading ? 'Checking...' : 'Check Status'}
                            </button>
                        </form>
                        {error && (
                            <div style={{ marginTop: '1.5rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
                                ⚠️ {error}
                            </div>
                        )}
                        <div style={{ marginTop: '2rem' }}>
                            <Link to="/dashboard" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
                                View full dashboard instead
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="app-container">
            <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1 className="title-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Antigravity Restaurant</h1>
                    </Link>
                    <button onClick={handleReset} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                        Change Number
                    </button>
                </div>
            </header>

            <main className="container" style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
                <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', borderTop: '4px solid var(--accent-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div style={{ textAlign: 'left' }}>
                            <h2 style={{ margin: 0 }}>Hello, {customer.name}!</h2>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0' }}>Party of {customer.party_size}</p>
                        </div>
                        <span className="status-badge status-reserved">In Queue</span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            Your Position
                        </div>
                        <div style={{ fontSize: '4rem', fontWeight: '800', color: 'white' }}>
                            #{customer.position}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>EST. WAIT</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{customer.estimated_wait_time} min</div>
                        </div>
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>NOTIFIED</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{customer.notified ? '✅ Yes' : '⏳ No'}</div>
                        </div>
                    </div>

                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', marginBottom: '2rem' }}>
                        🤖 Back-end agents are currently optimizing table assignments for your party.
                        We will notify you the moment your table is ready.
                    </div>

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Wait time looking too long?
                        </p>
                        <button className="btn btn-outline" style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                            Cancel Waitlist Entry
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default CustomerStatus
