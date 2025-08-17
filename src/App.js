import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import ProfileManagement from './components/profile/ProfileManagement'
import AttendanceTracker from './components/attendance/AttendanceTracker'
import LeaveRequest from './components/leave/LeaveRequest'
import ExpenseRequest from './components/expense/ExpenseRequest'
import Header from './components/common/Header'
import Sidebar from './components/common/Sidebar'
import { authService } from './services/authService'
import './styles/global.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkUserSession()
  }, [])

  const checkUserSession = async () => {
    try {
      const session = await authService.getCurrentSession()
      if (session) {
        const profileData = await authService.getEmployeeProfile(session.user.id)
        if (profileData && profileData.employees) {
          setUser(session.user)
          setProfile(profileData)
        } else {
          setError('Employee profile not found. Please contact your administrator.')
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setError('Failed to load employee profile. Please try logging in again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = ({ user, profile }) => {
    if (profile && profile.employees) {
      setUser(user)
      setProfile(profile)
      setError(null)
    } else {
      setError('Employee profile not found. Please contact your administrator.')
    }
  }

  const handleLogout = async () => {
    try {
      await authService.signOut()
      setUser(null)
      setProfile(null)
      setError(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="loading-screen">
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div className="error-message">
            {error}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setError(null)
              setUser(null)
              setProfile(null)
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!user || !profile || !profile.employees) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <div className="app">
        <Header 
          employee={profile.employees}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />
        
        <div className="app-content">
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard employee={profile.employees} />} />
              <Route path="/profile" element={<ProfileManagement employee={profile.employees} />} />
              <Route path="/attendance" element={<AttendanceTracker employeeId={profile.employees.id} />} />
              <Route path="/leave" element={<LeaveRequest employeeId={profile.employees.id} />} />
              <Route path="/expense" element={<ExpenseRequest employeeId={profile.employees.id} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
