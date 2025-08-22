import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const Dashboard = ({ employee, onEmployeeUpdate }) => {
  const [stats, setStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    attendanceToday: null,
    thisMonthAttendance: 0,
    leaveBalance: 15
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [employeeData, setEmployeeData] = useState(employee)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch fresh employee data including profile photo
    fetchEmployeeData()
    fetchDashboardData()
  }, [employee.id])

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employee.id)
        .single()

      if (error) throw error
      setEmployeeData(data)
      
      // Notify parent component if needed
      if (onEmployeeUpdate) {
        onEmployeeUpdate(data)
      }
    } catch (error) {
      console.error('Error fetching employee data:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      // Fix: Check today's attendance properly
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Fetch leave statistics
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)

      // Fetch this month's attendance
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0]
      const { data: monthAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', startOfMonth)
        .eq('status', 'Present')

      // Fetch recent leave requests (improved)
      const { data: recentLeaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(3)

      setStats({
        pendingLeaves: leaves?.filter(l => l.status === 'pending').length || 0,
        attendanceToday: todayAttendance,
        thisMonthAttendance: monthAttendance?.length || 0,
        leaveBalance: 15 - (leaves?.filter(l => l.status === 'approved').length || 0)
      })

      setRecentActivities(recentLeaves || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-warning',
      approved: 'status-success',
      rejected: 'status-danger'
    }
    return `status-badge ${statusClasses[status] || 'status-secondary'}`
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return <div className="loading-screen">Loading dashboard...</div>
  }

  return (
    <div className="modern-dashboard">
      {/* Welcome Header with Profile Photo */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1>Welcome back, {employeeData.name}!</h1>
          <p className="welcome-subtitle">Here's your workspace overview for today</p>
          <div className="current-time">{getCurrentTime()}</div>
        </div>
        <div className="welcome-avatar">
          {employeeData.profile_photo_url ? (
            <img 
              src={employeeData.profile_photo_url} 
              alt="Profile" 
              className="avatar-photo"
            />
          ) : (
            <div className="avatar-circle">
              {employeeData.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-modern-grid">
        <div className="stat-modern-card primary">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.thisMonthAttendance}</h3>
            <p>Days Present This Month</p>
          </div>
        </div>
        
        <div className="stat-modern-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>{stats.attendanceToday ? 'Present' : 'Not Marked'}</h3>
            <p>Today's Status</p>
          </div>
        </div>
        
        <div className="stat-modern-card">
          <div className="stat-icon">🏖️</div>
          <div className="stat-content">
            <h3>{stats.leaveBalance}</h3>
            <p>Leave Balance</p>
          </div>
        </div>
        
        <div className="stat-modern-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingLeaves}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* Quick Actions */}
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Quick Actions</h3>
            <p>Common tasks and requests</p>
          </div>
          <div className="quick-actions-grid">
            <a href="/attendance" className="action-button primary">
              <div className="action-icon">📅</div>
              <span>Mark Attendance</span>
            </a>
            <a href="/leave" className="action-button secondary">
              <div className="action-icon">🏖️</div>
              <span>Request Leave</span>
            </a>
            <a href="/expense" className="action-button success">
              <div className="action-icon">💰</div>
              <span>Submit Expense</span>
            </a>
            <a href="/profile" className="action-button info">
              <div className="action-icon">👤</div>
              <span>Update Profile</span>
            </a>
          </div>
        </div>

        {/* Improved Recent Leave Requests */}
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Recent Leave Requests</h3>
            <p>Your latest leave applications</p>
          </div>
          <div className="leave-requests-modern">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="leave-request-item">
                  <div className="leave-dates">
                    <div className="leave-type">{activity.leave_type}</div>
                    <div className="leave-period">
                      {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
                    </div>
                    {activity.reason && (
                      <div className="leave-reason">{activity.reason}</div>
                    )}
                  </div>
                  <div className="leave-status">
                    <span className={getStatusBadge(activity.status)}>
                      {activity.status}
                    </span>
                    <div className="leave-date">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-small">
                <div className="empty-icon">📝</div>
                <p>No recent leave requests</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Info Summary */}
      <div className="modern-card">
        <div className="card-header-modern">
          <h3>Employee Information</h3>
          <p>Your employment details</p>
        </div>
        <div className="employee-info-grid">
          <div className="info-modern-item">
            <div className="info-label">Employee ID</div>
            <div className="info-value">{employeeData.employee_id || 'N/A'}</div>
          </div>
          <div className="info-modern-item">
            <div className="info-label">Department</div>
            <div className="info-value">{employeeData.department || 'N/A'}</div>
          </div>
          <div className="info-modern-item">
            <div className="info-label">Role</div>
            <div className="info-value">{employeeData.role || 'N/A'}</div>
          </div>
          <div className="info-modern-item">
            <div className="info-label">Joining Date</div>
            <div className="info-value">{employeeData.joining_date ? formatDate(employeeData.joining_date) : 'N/A'}</div>
          </div>
          <div className="info-modern-item">
            <div className="info-label">Email</div>
            <div className="info-value">{employeeData.email}</div>
          </div>
          <div className="info-modern-item">
            <div className="info-label">Phone</div>
            <div className="info-value">{employeeData.phone || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
