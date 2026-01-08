import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import StaffLogin from './pages/StaffLogin'
import StaffPanel from './pages/StaffPanel'
import ManagerDashboard from './pages/ManagerDashboard'
import CustomerStatus from './pages/CustomerStatus'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<CustomerStatus />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/staff" element={<StaffLogin />} />
        <Route path="/staff/panel" element={<StaffPanel />} />
        <Route path="/manager" element={<ManagerDashboard />} />
      </Routes>
    </Router>
  )
}

export default App
