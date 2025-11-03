import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-GB', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

const AttendanceTracker = ({ employeeId }) => {
  const [todayAttendance, setTodayAttendance] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [colleagues, setColleagues] = useState([])
  const [reports, setReports] = useState({
    daily: { totalHours: 0, sessions: 0 },
    weekly: { totalHours: 0, daysPresent: 0, avgHours: 0 },
    monthly: { totalHours: 0, daysPresent: 0, avgHours: 0, attendanceRate: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [activeTab, setActiveTab] = useState('today')

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
    fetchAttendanceData()
    fetchColleagues()
    fetchReports()
  }, [employeeId])

  const fetchAttendanceData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .order('created_at', { ascending: true })

      setTodayAttendance(todayData || [])
      
      const activeSession = todayData?.find(record => 
        record.check_in_time && !record.check_out_time
      )
      setCurrentSession(activeSession || null)
      
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchColleagues = async () => {
    try {
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('department')
        .eq('id', employeeId)
        .single()

      if (!currentEmployee?.department) return

      const today = new Date().toISOString().split('T')[0]
      const { data: colleagueData } = await supabase
        .from('employees')
        .select(`
          id, name,
          attendance!inner(status, check_in_time, date)
        `)
        .eq('department', currentEmployee.department)
        .eq('attendance.date', today)
        .neq('id', employeeId)
        .limit(8)

      setColleagues(colleagueData || [])
    } catch (error) {
      console.error('Error fetching colleagues:', error)
    }
  }

  const fetchReports = async () => {
    try {
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const todayStr = new Date().toISOString().split('T')[0]
      const { data: dailyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', todayStr)

      const { data: weeklyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startOfWeek.toISOString().split('T')[0])

      const { data: monthlyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startOfMonth.toISOString().split('T')[0])

      const dailyHours = calculateTotalHours(dailyData || [])
      const weeklyHours = calculateTotalHours(weeklyData || [])
      const monthlyHours = calculateTotalHours(monthlyData || [])

      const weeklyDays = new Set((weeklyData || []).map(r => r.date)).size
      const monthlyDays = new Set((monthlyData || []).map(r => r.date)).size
      const totalWorkingDays = new Date().getDate()

      setReports({
        daily: {
          totalHours: dailyHours,
          sessions: (dailyData || []).length
        },
        weekly: {
          totalHours: weeklyHours,
          daysPresent: weeklyDays,
          avgHours: weeklyDays > 0 ? (weeklyHours / weeklyDays) : 0
        },
        monthly: {
          totalHours: monthlyHours,
          daysPresent: monthlyDays,
          avgHours: monthlyDays > 0 ? (monthlyHours / monthlyDays) : 0,
          attendanceRate: (monthlyDays / totalWorkingDays) * 100
        }
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const calculateTotalHours = (records) => {
    return records.reduce((total, record) => {
      if (record.check_in_time && record.check_out_time) {
        const minutes = calculateMinutesWorked(record.check_in_time, record.check_out_time)
        return total + (minutes / 60)
      }
      return total
    }, 0)
  }

  const calculateMinutesWorked = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0
    
    const [h1, m1, s1] = checkIn.split(':').map(Number)
    const [h2, m2, s2] = checkOut.split(':').map(Number)
    
    const time1InSeconds = h1 * 3600 + m1 * 60 + s1
    const time2InSeconds = h2 * 3600 + m2 * 60 + s2
    
    let diffInSeconds = time2InSeconds - time1InSeconds
    if (diffInSeconds < 0) {
      diffInSeconds += 24 * 3600
    }
    
    return Math.floor(diffInSeconds / 60)
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatHours = (hours) => {
    if (hours === 0) return '0h 0m'
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const handleClockIn = async () => {
    setActionLoading(true)
    setMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = getCurrentTime()

      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            employee_id: employeeId,
            date: today,
            status: 'Present',
            check_in_time: currentTime,
            notes: 'Checked in via employee portal'
          }
        ])
        .select()
        .single()

      if (error) throw error

      setMessage('✅ Successfully clocked in!')
      setMessageType('success')
      setCurrentSession(data)
      fetchAttendanceData()
      fetchReports()
    } catch (error) {
      setMessage('❌ Error clocking in: ' + error.message)
      setMessageType('error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!currentSession) return
    
    setActionLoading(true)
    setMessage('')

    try {
      const currentTime = getCurrentTime()

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out_time: currentTime,
          notes: (currentSession.notes || '') + ' | Checked out via employee portal'
        })
        .eq('id', currentSession.id)

      if (error) throw error

      setMessage('✅ Successfully clocked out!')
      setMessageType('success')
      setCurrentSession(null)
      fetchAttendanceData()
      fetchReports()
    } catch (error) {
      setMessage('❌ Error clocking out: ' + error.message)
      setMessageType('error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container-modern">
        <div className="spinner-modern"></div>
        <p>Loading attendance data...</p>
      </div>
    )
  }

  return (
    <div className="attendance-tracker-modern">
      {/* Header Section */}
      <div className="page-header-gradient">
        <div className="header-content-flex">
          <div className="header-text-section">
            <h1>⏰ Attendance Tracker</h1>
            <p>Track your work hours and view reports</p>
          </div>
          <div className="header-time-display">
            <div className="live-time-large">{currentTime}</div>
            <div className="live-date-small">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`alert-banner ${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="alert-close">✕</button>
        </div>
      )}

      {/* Clock In/Out Card */}
      <div className="clock-card-hero">
        <div className="clock-status-section">
          {currentSession ? (
            <>
              <div className="status-indicator active">
                <div className="pulse-dot"></div>
                <span>Active Session</span>
              </div>
              <div className="session-details-grid">
                <div className="session-detail-item">
                  <span className="detail-label">Clocked In</span>
                  <span className="detail-value">{formatTime(currentSession.check_in_time)}</span>
                </div>
                <div className="session-detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value highlight">
                    {formatHours(calculateMinutesWorked(currentSession.check_in_time, getCurrentTime()) / 60)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="status-indicator inactive">
              <span>Not Clocked In</span>
            </div>
          )}
        </div>

        <div className="clock-button-section">
          {!currentSession ? (
            <button
              className="btn-clock in"
              onClick={handleClockIn}
              disabled={actionLoading}
            >
              <span className="btn-icon">🟢</span>
              <span className="btn-text">{actionLoading ? 'Clocking In...' : 'CLOCK IN'}</span>
            </button>
          ) : (
            <button
              className="btn-clock out"
              onClick={handleClockOut}
              disabled={actionLoading}
            >
              <span className="btn-icon">🔴</span>
              <span className="btn-text">{actionLoading ? 'Clocking Out...' : 'CLOCK OUT'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-modern">
        <button 
          className={`tab-button ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <span className="tab-icon">📋</span>
          <span>Today</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📊</span>
          <span>Reports</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'colleagues' ? 'active' : ''}`}
          onClick={() => setActiveTab('colleagues')}
        >
          <span className="tab-icon">👥</span>
          <span>Team</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-modern">
        {/* Today Tab */}
        {activeTab === 'today' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>📅 Today's Sessions</h3>
              <span className="badge-count">{todayAttendance.length} session{todayAttendance.length !== 1 ? 's' : ''}</span>
            </div>
            
            {todayAttendance.length > 0 ? (
              <div className="sessions-timeline">
                {todayAttendance.map((record, index) => {
                  const duration = calculateMinutesWorked(record.check_in_time, record.check_out_time)
                  const isActive = !record.check_out_time
                  return (
                    <div key={record.id} className={`session-card ${isActive ? 'active-session' : ''}`}>
                      <div className="session-badge">#{index + 1}</div>
                      <div className="session-info-grid">
                        <div className="session-time-block">
                          <span className="time-icon">🟢</span>
                          <div className="time-details">
                            <span className="time-label">Check In</span>
                            <span className="time-value">{formatTime(record.check_in_time)}</span>
                          </div>
                        </div>
                        <div className="session-time-block">
                          <span className="time-icon">{isActive ? '⏱️' : '🔴'}</span>
                          <div className="time-details">
                            <span className="time-label">Check Out</span>
                            <span className="time-value">
                              {record.check_out_time ? formatTime(record.check_out_time) : 
                                <span className="active-label">Active Now</span>}
                            </span>
                          </div>
                        </div>
                        <div className="session-duration-block">
                          <span className="duration-icon">⏲️</span>
                          <div className="time-details">
                            <span className="time-label">Duration</span>
                            <span className="time-value duration-highlight">
                              {record.check_out_time ? formatHours(duration / 60) : 
                                formatHours(calculateMinutesWorked(record.check_in_time, getCurrentTime()) / 60)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">⏰</div>
                <h4>No Sessions Today</h4>
                <p>Clock in to start tracking your work hours</p>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-container-modern">
            <div className="report-card daily">
              <div className="report-header">
                <h4>📊 Daily Summary</h4>
                <span className="report-subtitle">Today's work</span>
              </div>
              <div className="report-metrics">
                <div className="metric-item">
                  <div className="metric-value">{formatHours(reports.daily.totalHours)}</div>
                  <div className="metric-label">Total Hours</div>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <div className="metric-value">{reports.daily.sessions}</div>
                  <div className="metric-label">Sessions</div>
                </div>
              </div>
            </div>

            <div className="report-card weekly">
              <div className="report-header">
                <h4>📈 Weekly Summary</h4>
                <span className="report-subtitle">This week's performance</span>
              </div>
              <div className="report-metrics">
                <div className="metric-item">
                  <div className="metric-value">{formatHours(reports.weekly.totalHours)}</div>
                  <div className="metric-label">Total Hours</div>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <div className="metric-value">{reports.weekly.daysPresent}</div>
                  <div className="metric-label">Days Present</div>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <div className="metric-value">{formatHours(reports.weekly.avgHours)}</div>
                  <div className="metric-label">Avg/Day</div>
                </div>
              </div>
            </div>

            <div className="report-card monthly">
              <div className="report-header">
                <h4>📅 Monthly Summary</h4>
                <span className="report-subtitle">This month's overview</span>
              </div>
              <div className="report-metrics">
                <div className="metric-item">
                  <div className="metric-value">{formatHours(reports.monthly.totalHours)}</div>
                  <div className="metric-label">Total Hours</div>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <div className="metric-value">{reports.monthly.daysPresent}</div>
                  <div className="metric-label">Days Present</div>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <div className="metric-value">{reports.monthly.attendanceRate.toFixed(1)}%</div>
                  <div className="metric-label">Attendance Rate</div>
                </div>
              </div>
              <div className="progress-wrapper">
                <div className="progress-label-row">
                  <span>Monthly Progress</span>
                  <span className="progress-percentage">{reports.monthly.attendanceRate.toFixed(1)}%</span>
                </div>
                <div className="progress-bar-track">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(reports.monthly.attendanceRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'colleagues' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>👥 Team Status</h3>
              <p className="card-subtitle">Your department colleagues' attendance today</p>
            </div>
            
            {colleagues.length > 0 ? (
              <div className="team-grid-modern">
                {colleagues.map((colleague) => (
                  <div key={colleague.id} className="team-member-card">
                    <div className="member-avatar-modern">
                      {colleague.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-details">
                      <div className="member-name">{colleague.name}</div>
                      <div className="member-status-row">
                        <span className={`status-dot ${
                          colleague.attendance[0]?.status === 'Present' ? 'present' : 'absent'
                        }`}></span>
                        <span className="status-text">
                          {colleague.attendance[0]?.status || 'Not Marked'}
                        </span>
                      </div>
                      {colleague.attendance[0]?.check_in_time && (
                        <div className="member-time">
                          🟢 {formatTime(colleague.attendance[0].check_in_time)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">👥</div>
                <h4>No Team Members Found</h4>
                <p>No colleagues from your department have marked attendance today</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceTracker
