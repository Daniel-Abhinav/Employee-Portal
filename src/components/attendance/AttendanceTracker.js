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
      // Get current employee's department
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('department')
        .eq('id', employeeId)
        .single()

      if (!currentEmployee?.department) return

      // Get colleagues from same department with today's attendance
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

      // Daily report (today)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: dailyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', todayStr)

      // Weekly report
      const { data: weeklyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startOfWeek.toISOString().split('T')[0])

      // Monthly report
      const { data: monthlyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startOfMonth.toISOString().split('T')[0])

      // Calculate reports
      const dailyHours = calculateTotalHours(dailyData || [])
      const weeklyHours = calculateTotalHours(weeklyData || [])
      const monthlyHours = calculateTotalHours(monthlyData || [])

      const weeklyDays = new Set((weeklyData || []).map(r => r.date)).size
      const monthlyDays = new Set((monthlyData || []).map(r => r.date)).size
      const totalWorkingDays = new Date().getDate() // Simplified

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

      setMessage('Successfully clocked in!')
      setMessageType('success')
      setCurrentSession(data)
      fetchAttendanceData()
      fetchReports()
    } catch (error) {
      setMessage('Error clocking in: ' + error.message)
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

      setMessage('Successfully clocked out!')
      setMessageType('success')
      setCurrentSession(null)
      fetchAttendanceData()
      fetchReports()
    } catch (error) {
      setMessage('Error clocking out: ' + error.message)
      setMessageType('error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading attendance...</div>
  }

  return (
    <div className="attendance-modern">
      <div className="attendance-header">
        <h2>Attendance Tracker</h2>
        <p>Track your work hours and view reports</p>
      </div>

      {message && (
        <div className={`message-modern ${messageType}`}>
          {message}
        </div>
      )}

      {/* Live Clock & Clock In/Out */}
      <div className="modern-card clock-section">
        <div className="live-clock">
          {currentTime}
        </div>
        
        <div className="clock-controls">
          {!currentSession ? (
            <button
              className="clock-button clock-in"
              onClick={handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? 'Clocking In...' : 'CLOCK IN'}
            </button>
          ) : (
            <button
              className="clock-button clock-out"
              onClick={handleClockOut}
              disabled={actionLoading}
            >
              {actionLoading ? 'Clocking Out...' : 'CLOCK OUT'}
            </button>
          )}
        </div>

        {currentSession && (
          <div className="current-session-info">
            <p>Active since: {formatTime(currentSession.check_in_time)}</p>
            <p>Duration: {formatHours(calculateMinutesWorked(currentSession.check_in_time, getCurrentTime()) / 60)}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button 
          className={`tab-btn ${activeTab === 'colleagues' ? 'active' : ''}`}
          onClick={() => setActiveTab('colleagues')}
        >
          Team Status
        </button>
      </div>

      {/* Today Tab */}
      {activeTab === 'today' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Today's Sessions</h3>
            <p>Your clock in/out sessions for today</p>
          </div>
          
          {todayAttendance.length > 0 ? (
            <div className="sessions-list">
              {todayAttendance.map((record, index) => {
                const duration = calculateMinutesWorked(record.check_in_time, record.check_out_time)
                return (
                  <div key={record.id} className="session-item">
                    <div className="session-number">#{index + 1}</div>
                    <div className="session-times">
                      <div className="time-in">
                        <span className="time-label">In:</span>
                        <span className="time-value">{formatTime(record.check_in_time)}</span>
                      </div>
                      <div className="time-out">
                        <span className="time-label">Out:</span>
                        <span className="time-value">
                          {record.check_out_time ? formatTime(record.check_out_time) : 
                            <span className="active-badge">Active</span>}
                        </span>
                      </div>
                    </div>
                    <div className="session-duration">
                      {record.check_out_time ? formatHours(duration / 60) : 
                        formatHours(calculateMinutesWorked(record.check_in_time, getCurrentTime()) / 60)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">⏰</div>
              <p>No sessions today. Clock in to start!</p>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="reports-grid">
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>📊 Daily Report</h3>
              <p>Today's work summary</p>
            </div>
            <div className="report-stats">
              <div className="report-stat">
                <div className="stat-value">{formatHours(reports.daily.totalHours)}</div>
                <div className="stat-label">Total Hours</div>
              </div>
              <div className="report-stat">
                <div className="stat-value">{reports.daily.sessions}</div>
                <div className="stat-label">Sessions</div>
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="card-header-modern">
              <h3>📈 Weekly Report</h3>
              <p>This week's performance</p>
            </div>
            <div className="report-stats">
              <div className="report-stat">
                <div className="stat-value">{formatHours(reports.weekly.totalHours)}</div>
                <div className="stat-label">Total Hours</div>
              </div>
              <div className="report-stat">
                <div className="stat-value">{reports.weekly.daysPresent}</div>
                <div className="stat-label">Days Present</div>
              </div>
              <div className="report-stat">
                <div className="stat-value">{formatHours(reports.weekly.avgHours)}</div>
                <div className="stat-label">Avg/Day</div>
              </div>
            </div>
          </div>

          <div className="modern-card">
            <div className="card-header-modern">
              <h3>📅 Monthly Report</h3>
              <p>This month's overview</p>
            </div>
            <div className="report-stats">
              <div className="report-stat">
                <div className="stat-value">{formatHours(reports.monthly.totalHours)}</div>
                <div className="stat-label">Total Hours</div>
              </div>
              <div className="report-stat">
                <div className="stat-value">{reports.monthly.daysPresent}</div>
                <div className="stat-label">Days Present</div>
              </div>
              <div className="report-stat">
                <div className="stat-value">{reports.monthly.attendanceRate.toFixed(1)}%</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-label">Monthly Progress</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(reports.monthly.attendanceRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colleagues Tab */}
      {activeTab === 'colleagues' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>👥 Team Status</h3>
            <p>Your department colleagues' attendance today</p>
          </div>
          
          {colleagues.length > 0 ? (
            <div className="colleagues-grid">
              {colleagues.map((colleague) => (
                <div key={colleague.id} className="colleague-card">
                  <div className="colleague-avatar">
                    {colleague.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="colleague-info">
                    <div className="colleague-name">{colleague.name}</div>
                    <div className="colleague-status">
                      <span className={`status-badge ${
                        colleague.attendance[0]?.status === 'Present' ? 'status-success' : 'status-secondary'
                      }`}>
                        {colleague.attendance[0]?.status || 'Not Marked'}
                      </span>
                    </div>
                    {colleague.attendance[0]?.check_in_time && (
                      <div className="colleague-time">
                        In: {formatTime(colleague.attendance[0].check_in_time)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">👥</div>
              <p>No colleagues found in your department</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AttendanceTracker
