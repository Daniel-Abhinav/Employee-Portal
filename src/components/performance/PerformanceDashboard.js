import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const PerformanceDashboard = ({ employeeId }) => {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    latestReview: null,
    skillsBreakdown: {}
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchPerformanceData()
  }, [employeeId])

  const fetchPerformanceData = async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          reviewer:employees!reviewer_id(name, email),
          employee:employees!employee_id(name, department)
        `)
        .eq('employee_id', employeeId)
        .order('review_period_end', { ascending: false })

      if (reviewsError) throw reviewsError

      const reviewsList = reviewsData || []
      setReviews(reviewsList)

      if (reviewsList.length > 0) {
        const totalReviews = reviewsList.length
        const avgRating = reviewsList.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / totalReviews
        const latestReview = reviewsList[0]
        
        const skillsBreakdown = latestReview ? {
          technical_skills: latestReview.technical_skills || 0,
          communication: latestReview.communication || 0,
          teamwork: latestReview.teamwork || 0,
          leadership: latestReview.leadership || 0,
          problem_solving: latestReview.problem_solving || 0,
          attendance_punctuality: latestReview.attendance_punctuality || 0,
          goals_achievement: latestReview.goals_achievement || 0
        } : {}

        setStats({
          totalReviews,
          averageRating: Math.round(avgRating * 10) / 10,
          latestReview,
          skillsBreakdown
        })
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
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

  const getSkillLabel = (skillKey) => {
    const labels = {
      technical_skills: 'Technical Skills',
      communication: 'Communication',
      teamwork: 'Teamwork',
      leadership: 'Leadership',
      problem_solving: 'Problem Solving',
      attendance_punctuality: 'Attendance & Punctuality',
      goals_achievement: 'Goals Achievement'
    }
    return labels[skillKey] || skillKey
  }

  const getSkillIcon = (skillKey) => {
    const icons = {
      technical_skills: '💻',
      communication: '💬',
      teamwork: '🤝',
      leadership: '👑',
      problem_solving: '🧩',
      attendance_punctuality: '⏰',
      goals_achievement: '🎯'
    }
    return icons[skillKey] || '📊'
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981'
    if (rating >= 4) return '#34d399'
    if (rating >= 3.5) return '#fbbf24'
    if (rating >= 3) return '#f59e0b'
    if (rating >= 2) return '#f97316'
    return '#ef4444'
  }

  const getRatingText = (rating) => {
    if (rating >= 4.5) return 'Outstanding'
    if (rating >= 4) return 'Excellent'
    if (rating >= 3.5) return 'Very Good'
    if (rating >= 3) return 'Good'
    if (rating >= 2) return 'Needs Improvement'
    return 'Unsatisfactory'
  }

  if (loading) {
    return (
      <div className="loading-container-modern">
        <div className="spinner-modern"></div>
        <p>Loading performance data...</p>
      </div>
    )
  }

  return (
    <div className="performance-dashboard-enhanced">
      {/* Header */}
      <div className="page-header-gradient">
        <div className="header-content-flex">
          <div className="header-text-section">
            <h1>📊 My Performance Reviews</h1>
            <p>Track your performance evaluations and development progress</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-modern">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">🎯</span>
          <span>Overview</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <span className="tab-icon">📋</span>
          <span>All Reviews</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <span className="tab-icon">📈</span>
          <span>Skills Analysis</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-modern">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Performance Summary Cards */}
            <div className="performance-stats-grid">
              <div className="perf-stat-card primary">
                <div className="stat-icon-perf">⭐</div>
                <div className="stat-content-perf">
                  <div className="stat-value-perf">{stats.averageRating.toFixed(1)}</div>
                  <div className="stat-label-perf">Average Rating</div>
                </div>
              </div>
              <div className="perf-stat-card">
                <div className="stat-icon-perf">📊</div>
                <div className="stat-content-perf">
                  <div className="stat-value-perf">{stats.totalReviews}</div>
                  <div className="stat-label-perf">Total Reviews</div>
                </div>
              </div>
              <div className="perf-stat-card">
                <div className="stat-icon-perf">📅</div>
                <div className="stat-content-perf">
                  <div className="stat-value-perf">
                    {stats.latestReview ? formatDate(stats.latestReview.review_period_end) : 'N/A'}
                  </div>
                  <div className="stat-label-perf">Latest Review</div>
                </div>
              </div>
              <div className="perf-stat-card">
                <div className="stat-icon-perf">🎯</div>
                <div className="stat-content-perf">
                  <div className="stat-value-perf">{stats.latestReview?.overall_rating || 'N/A'}/5</div>
                  <div className="stat-label-perf">Current Rating</div>
                </div>
              </div>
            </div>

            {/* Latest Review Highlight */}
            {stats.latestReview ? (
              <div className="content-card-modern">
                <div className="card-title-section">
                  <h3>🌟 Latest Performance Review</h3>
                  <span className="badge-count">
                    {formatDate(stats.latestReview.created_at)}
                  </span>
                </div>
                
                <div className="latest-review-layout">
                  <div className="review-header-info">
                    <div className="review-period-display">
                      <span className="period-label">Review Period</span>
                      <span className="period-dates">
                        {formatDate(stats.latestReview.review_period_start)} → {formatDate(stats.latestReview.review_period_end)}
                      </span>
                    </div>
                    
                    <div className="review-rating-display">
                      <span className="rating-label">Overall Rating</span>
                      <div 
                        className="rating-badge-large"
                        style={{ backgroundColor: getRatingColor(stats.latestReview.overall_rating) }}
                      >
                        <span className="rating-stars">⭐</span>
                        <span className="rating-number">{stats.latestReview.overall_rating}/5</span>
                        <span className="rating-text">{getRatingText(stats.latestReview.overall_rating)}</span>
                      </div>
                    </div>

                    <div className="reviewer-info">
                      <span className="reviewer-label">Reviewed by</span>
                      <span className="reviewer-name">👤 {stats.latestReview.reviewer?.name || 'N/A'}</span>
                    </div>
                  </div>

                  {stats.latestReview.comments && (
                    <div className="review-section-box">
                      <h4>💬 Comments</h4>
                      <p>{stats.latestReview.comments}</p>
                    </div>
                  )}

                  {stats.latestReview.strengths && (
                    <div className="review-section-box strengths">
                      <h4>💪 Strengths</h4>
                      <p>{stats.latestReview.strengths}</p>
                    </div>
                  )}

                  {stats.latestReview.improvement_areas && (
                    <div className="review-section-box improvements">
                      <h4>📈 Areas for Improvement</h4>
                      <p>{stats.latestReview.improvement_areas}</p>
                    </div>
                  )}

                  {stats.latestReview.goals_next_period && (
                    <div className="review-section-box goals">
                      <h4>🎯 Goals for Next Period</h4>
                      <p>{stats.latestReview.goals_next_period}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">📊</div>
                <h4>No Performance Reviews Yet</h4>
                <p>Your performance reviews will appear here once completed by your manager</p>
              </div>
            )}
          </div>
        )}

        {/* All Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>📋 Performance Review History</h3>
              <span className="badge-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
            
            {reviews.length > 0 ? (
              <div className="reviews-timeline-modern">
                {reviews.map((review) => (
                  <div key={review.id} className="timeline-item-performance">
                    <div className="timeline-marker-perf" style={{ backgroundColor: getRatingColor(review.overall_rating) }}></div>
                    <div className="review-card-timeline">
                      <div className="review-card-header-perf">
                        <div className="review-title-section">
                          <h4>Performance Review</h4>
                          <span className="review-period-small">
                            {formatDate(review.review_period_start)} → {formatDate(review.review_period_end)}
                          </span>
                        </div>
                        <div className="review-meta-section">
                          <span className="reviewer-badge">👤 {review.reviewer?.name}</span>
                          <span 
                            className="overall-rating-badge-small"
                            style={{ backgroundColor: getRatingColor(review.overall_rating) }}
                          >
                            ⭐ {review.overall_rating}/5
                          </span>
                        </div>
                      </div>

                      <div className="skills-grid-compact">
                        {review.technical_skills && (
                          <div className="skill-chip">
                            💻 Technical: <strong>{review.technical_skills}/5</strong>
                          </div>
                        )}
                        {review.communication && (
                          <div className="skill-chip">
                            💬 Communication: <strong>{review.communication}/5</strong>
                          </div>
                        )}
                        {review.teamwork && (
                          <div className="skill-chip">
                            🤝 Teamwork: <strong>{review.teamwork}/5</strong>
                          </div>
                        )}
                        {review.leadership && (
                          <div className="skill-chip">
                            👑 Leadership: <strong>{review.leadership}/5</strong>
                          </div>
                        )}
                      </div>

                      {review.comments && (
                        <div className="review-content-box">
                          <h5>💬 Comments</h5>
                          <p>{review.comments}</p>
                        </div>
                      )}

                      {review.strengths && (
                        <div className="review-content-box">
                          <h5>💪 Strengths</h5>
                          <p>{review.strengths}</p>
                        </div>
                      )}

                      {review.improvement_areas && (
                        <div className="review-content-box">
                          <h5>📈 Areas for Improvement</h5>
                          <p>{review.improvement_areas}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">📝</div>
                <h4>No Performance Reviews</h4>
                <p>Your performance reviews will appear here once completed by your manager</p>
              </div>
            )}
          </div>
        )}

        {/* Skills Analysis Tab */}
        {activeTab === 'skills' && (
          <div className="skills-analysis-content">
            {Object.keys(stats.skillsBreakdown).length > 0 ? (
              <>
                <div className="content-card-modern">
                  <div className="card-title-section">
                    <h3>📈 Skills Performance Analysis</h3>
                    <p className="card-subtitle">Detailed breakdown from your latest review</p>
                  </div>

                  <div className="skills-bars-container">
                    {Object.entries(stats.skillsBreakdown).map(([skill, rating]) => (
                      <div key={skill} className="skill-bar-row">
                        <div className="skill-info-row">
                          <span className="skill-icon-emoji">{getSkillIcon(skill)}</span>
                          <span className="skill-name-text">{getSkillLabel(skill)}</span>
                          <span className="skill-score-badge">{rating}/5</span>
                        </div>
                        <div className="skill-bar-track">
                          <div 
                            className="skill-bar-fill-animated"
                            style={{ 
                              width: `${(rating / 5) * 100}%`,
                              backgroundColor: getRatingColor(rating)
                            }}
                          ></div>
                        </div>
                        <div className="skill-rating-label" style={{ color: getRatingColor(rating) }}>
                          {getRatingText(rating)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Focus Areas */}
                {Object.entries(stats.skillsBreakdown).filter(([, rating]) => rating < 4).length > 0 && (
                  <div className="content-card-modern">
                    <div className="card-title-section">
                      <h3>🎯 Recommended Focus Areas</h3>
                      <p className="card-subtitle">Skills that could benefit from improvement</p>
                    </div>

                    <div className="focus-areas-grid">
                      {Object.entries(stats.skillsBreakdown)
                        .filter(([, rating]) => rating < 4)
                        .sort(([,a], [,b]) => a - b)
                        .slice(0, 3)
                        .map(([skill, rating]) => (
                          <div key={skill} className="focus-area-card">
                            <div className="focus-icon">{getSkillIcon(skill)}</div>
                            <div className="focus-content">
                              <div className="focus-skill-name">{getSkillLabel(skill)}</div>
                              <div className="focus-current-rating">
                                Current: <strong>{rating}/5</strong>
                              </div>
                              <div className="focus-suggestion">
                                Consider focusing on improving this skill area in your development plan
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">📊</div>
                <h4>No Skills Data Available</h4>
                <p>Skills analysis will be available after your first performance review</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceDashboard
