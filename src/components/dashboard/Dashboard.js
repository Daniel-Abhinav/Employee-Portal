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
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
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
      
      if (onEmployeeUpdate) {
        onEmployeeUpdate(data)
      }
    } catch (error) {
      console.error('Error fetching employee data:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0]
      const { data: monthAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', startOfMonth)
        .eq('status', 'Present')

      const { data: recentLeaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(5)

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
    const statusConfig = {
      pending: { icon: '⏳', class: 'status-warning', label: 'Pending' },
      approved: { icon: '✅', class: 'status-success', label: 'Approved' },
      rejected: { icon: '❌', class: 'status-danger', label: 'Rejected' }
    }
    return statusConfig[status] || statusConfig.pending
  }

  if (loading) {
    return (
      <div className="loading-container-modern">
        <div className="spinner-modern"></div>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-enhanced">
      {/* Welcome Header */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="welcome-section">
            <h1>👋 Welcome back, {employeeData.name}!</h1>
            <p className="welcome-subtitle">Here's your workspace overview for today</p>
            <div className="hero-time-display">
              <span className="time-icon">🕐</span>
              <span className="time-text">{currentTime}</span>
            </div>
          </div>
          <div className="hero-avatar">
            {employeeData.profile_photo_url ? (
              <img 
                src={employeeData.profile_photo_url} 
                alt="Profile" 
                className="avatar-image-large"
              />
            ) : (
              <div className="avatar-placeholder-hero">
                {employeeData.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card-dashboard primary-stat">
          <div className="stat-icon-dashboard">📅</div>
          <div className="stat-details-dashboard">
            <div className="stat-value-dashboard">{stats.thisMonthAttendance}</div>
            <div className="stat-label-dashboard">Days Present This Month</div>
          </div>
        </div>
        
        <div className="stat-card-dashboard">
          <div className="stat-icon-dashboard">⏰</div>
          <div className="stat-details-dashboard">
            <div className="stat-value-dashboard">{stats.attendanceToday ? 'Present' : 'Absent'}</div>
            <div className="stat-label-dashboard">Today's Status</div>
          </div>
        </div>
        
        <div className="stat-card-dashboard">
          <div className="stat-icon-dashboard">🏖️</div>
          <div className="stat-details-dashboard">
            <div className="stat-value-dashboard">{stats.leaveBalance}</div>
            <div className="stat-label-dashboard">Leave Balance</div>
          </div>
        </div>
        
        <div className="stat-card-dashboard">
          <div className="stat-icon-dashboard">⏳</div>
          <div className="stat-details-dashboard">
            <div className="stat-value-dashboard">{stats.pendingLeaves}</div>
            <div className="stat-label-dashboard">Pending Approvals</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content-grid">
        {/* Quick Actions */}
        <div className="content-card-modern">
          <div className="card-title-section">
            <h3>⚡ Quick Actions</h3>
            <p className="card-subtitle">Common tasks and requests</p>
          </div>
          <div className="quick-actions-grid-modern">
            <a href="/attendance" className="action-card-modern primary-action">
              <div className="action-icon-modern">📅</div>
              <div className="action-text-modern">Mark Attendance</div>
            </a>
            <a href="/leave" className="action-card-modern secondary-action">
              <div className="action-icon-modern">🏖️</div>
              <div className="action-text-modern">Request Leave</div>
            </a>
            <a href="/expense" className="action-card-modern success-action">
              <div className="action-icon-modern">💰</div>
              <div className="action-text-modern">Submit Expense</div>
            </a>
            <a href="/profile" className="action-card-modern info-action">
              <div className="action-icon-modern">👤</div>
              <div className="action-text-modern">Update Profile</div>
            </a>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="content-card-modern">
          <div className="card-title-section">
            <h3>📋 Recent Leave Requests</h3>
            <span className="badge-count">{recentActivities.length} request{recentActivities.length !== 1 ? 's' : ''}</span>
          </div>
          {recentActivities.length > 0 ? (
            <div className="leave-requests-list-modern">
              {recentActivities.map((activity) => {
                const statusInfo = getStatusBadge(activity.status)
                return (
                  <div key={activity.id} className="leave-request-card-modern">
                    <div className="leave-request-main">
                      <div className="leave-type-badge-modern">{activity.leave_type}</div>
                      <div className="leave-period-text">
                        {formatDate(activity.start_date)} → {formatDate(activity.end_date)}
                      </div>
                      {activity.reason && (
                        <div className="leave-reason-text">{activity.reason}</div>
                      )}
                    </div>
                    <div className="leave-request-meta">
                      <span className={`status-badge-modern ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      <div className="leave-created-date">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state-modern">
              <div className="empty-icon-large">📝</div>
              <h4>No Recent Requests</h4>
              <p>Your leave requests will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Info */}
      <div className="content-card-modern">
        <div className="card-title-section">
          <h3>👤 Employee Information</h3>
          <p className="card-subtitle">Your employment details</p>
        </div>
        <div className="employee-info-grid-modern">
          <div className="info-item-modern">
            <div className="info-icon-modern">🆔</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Employee ID</div>
              <div className="info-value-modern">{employeeData.employee_id || 'N/A'}</div>
            </div>
          </div>
          <div className="info-item-modern">
            <div className="info-icon-modern">🏢</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Department</div>
              <div className="info-value-modern">{employeeData.department || 'N/A'}</div>
            </div>
          </div>
          <div className="info-item-modern">
            <div className="info-icon-modern">💼</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Role</div>
              <div className="info-value-modern">{employeeData.role || 'N/A'}</div>
            </div>
          </div>
          <div className="info-item-modern">
            <div className="info-icon-modern">📅</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Joining Date</div>
              <div className="info-value-modern">{employeeData.joining_date ? formatDate(employeeData.joining_date) : 'N/A'}</div>
            </div>
          </div>
          <div className="info-item-modern">
            <div className="info-icon-modern">📧</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Email</div>
              <div className="info-value-modern">{employeeData.email}</div>
            </div>
          </div>
          <div className="info-item-modern">
            <div className="info-icon-modern">📱</div>
            <div className="info-content-modern">
              <div className="info-label-modern">Phone</div>
              <div className="info-value-modern">{employeeData.phone || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
