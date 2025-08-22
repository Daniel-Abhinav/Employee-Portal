import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabaseClient'
import './styles/global.css'

// Import components
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import ProfileManagement from './components/profile/ProfileManagement'
import AttendanceTracker from './components/attendance/AttendanceTracker'
import LeaveRequest from './components/leave/LeaveRequest'
import ExpenseRequest from './components/expense/ExpenseRequest'
import Header from './components/common/Header'
import GoalTrackingKPI from './components/goals/GoalTrackingKPI'
import PerformanceDashboard from './components/performance/PerformanceDashboard'
import Sidebar from './components/common/Sidebar'

function App() {
  const [session, setSession] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchEmployeeData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchEmployeeData(session.user.id)
      } else {
        setEmployee(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const fetchEmployeeData = async (userId) => {
    try {
      setLoading(true)
      
      // Fetch user profile to get employee_id
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('employee_id, role')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Fetch employee data including profile photo
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userProfile.employee_id)
        .single()

      if (employeeError) throw employeeError

      // Combine user profile and employee data
      const completeEmployeeData = {
        ...employeeData,
        user_role: userProfile.role
      }

      setEmployee(completeEmployeeData)
    } catch (error) {
      console.error('Error fetching employee data:', error)
      // If error, logout user
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeUpdate = (updatedEmployee) => {
    setEmployee(prev => ({ ...prev, ...updatedEmployee }))
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setEmployee(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session || !employee) {
    return <Login />
  }

  return (
    <Router>
      <div className="app">
        <Header 
          employee={employee}
          onLogout={handleLogout}
          onToggleSidebar={toggleSidebar}
        />
        
        <div className="app-layout">
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            userRole={employee.user_role}
          />
          
          <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard 
                    employee={employee} 
                    onEmployeeUpdate={handleEmployeeUpdate}
                  />
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProfileManagement 
                    employee={employee} 
                    onProfileUpdate={handleEmployeeUpdate}
                  />
                } 
              />
              <Route 
                path="/attendance" 
                element={<AttendanceTracker employeeId={employee.id} />} 
              />
              <Route 
                path="/leave" 
                element={<LeaveRequest employeeId={employee.id} />} 
              />
              <Route 
                path="/expense" 
                element={<ExpenseRequest employeeId={employee.id} />} 
              />
              <Route 
                path="/performance" 
                element={<PerformanceDashboard employeeId={employee.id} />} 
              />
              <Route 
                path="/goals-kpi" 
                element={<GoalTrackingKPI employeeId={employee.id} />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
