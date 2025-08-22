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
      // Fetch performance reviews with reviewer info
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

      // Calculate statistics
      if (reviewsList.length > 0) {
        const totalReviews = reviewsList.length
        const avgRating = reviewsList.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / totalReviews
        const latestReview = reviewsList[0]
        
        // Calculate skills breakdown from latest review
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

  const getRatingColor = (rating) => {
    if (rating >= 4) return '#10b981' // Green
    if (rating >= 3) return '#f59e0b' // Yellow
    if (rating >= 2) return '#ef4444' // Red
    return '#6b7280' // Gray
  }

  const getRatingText = (rating) => {
    if (rating >= 4) return 'Excellent'
    if (rating >= 3) return 'Good'
    if (rating >= 2) return 'Needs Improvement'
    return 'Poor'
  }

  if (loading) {
    return <div className="loading-screen">Loading performance data...</div>
  }

  return (
    <div className="performance-dashboard">
      <div className="performance-header">
        <h2>My Performance Reviews</h2>
        <p>Track your performance evaluations and development progress</p>
      </div>

      {/* Performance Tabs */}
      <div className="performance-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          All Reviews
        </button>
        <button
          className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          {/* Performance Summary */}
          <div className="performance-summary-grid">
            <div className="summary-card primary">
              <div className="summary-icon">⭐</div>
              <div className="summary-content">
                <h3>{stats.averageRating.toFixed(1)}</h3>
                <p>Average Rating</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <h3>{stats.totalReviews}</h3>
                <p>Total Reviews</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📅</div>
              <div className="summary-content">
                <h3>{stats.latestReview ? formatDate(stats.latestReview.review_period_end) : 'N/A'}</h3>
                <p>Latest Review</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🎯</div>
              <div className="summary-content">
                <h3>{stats.latestReview?.overall_rating || 'N/A'}/5</h3>
                <p>Current Rating</p>
              </div>
            </div>
          </div>

          {/* Latest Review Highlight */}
          {stats.latestReview && (
            <div className="modern-card">
              <div className="card-header-modern">
                <h3>Latest Performance Review</h3>
                <p>Most recent evaluation from {stats.latestReview.reviewer?.name}</p>
              </div>
              
              <div className="latest-review-content">
                <div className="review-period">
                  <strong>Review Period:</strong> {formatDate(stats.latestReview.review_period_start)} - {formatDate(stats.latestReview.review_period_end)}
                </div>
                
                <div className="overall-rating">
                  <strong>Overall Rating:</strong>
                  <span 
                    className="rating-badge"
                    style={{ backgroundColor: getRatingColor(stats.latestReview.overall_rating) }}
                  >
                    {stats.latestReview.overall_rating}/5 - {getRatingText(stats.latestReview.overall_rating)}
                  </span>
                </div>

                {stats.latestReview.comments && (
                  <div className="review-section">
                    <h4>Comments</h4>
                    <p>{stats.latestReview.comments}</p>
                  </div>
                )}

                {stats.latestReview.strengths && (
                  <div className="review-section">
                    <h4>Strengths</h4>
                    <p>{stats.latestReview.strengths}</p>
                  </div>
                )}

                {stats.latestReview.improvement_areas && (
                  <div className="review-section">
                    <h4>Areas for Improvement</h4>
                    <p>{stats.latestReview.improvement_areas}</p>
                  </div>
                )}

                {stats.latestReview.goals_next_period && (
                  <div className="review-section">
                    <h4>Goals for Next Period</h4>
                    <p>{stats.latestReview.goals_next_period}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="reviews-section">
          <div className="section-header">
            <h3>Performance Review History</h3>
            <p>Complete history of your performance evaluations</p>
          </div>
          
          <div className="reviews-timeline">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="review-timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="review-card">
                    <div className="review-header">
                      <div className="review-title">
                        <h4>Performance Review</h4>
                        <span className="review-period">
                          {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                        </span>
                      </div>
                      <div className="review-meta">
                        <span className="reviewer">👤 {review.reviewer?.name}</span>
                        <span 
                          className="overall-rating-badge"
                          style={{ backgroundColor: getRatingColor(review.overall_rating) }}
                        >
                          ⭐ {review.overall_rating}/5
                        </span>
                      </div>
                    </div>

                    <div className="skills-grid">
                      <div className="skill-item">
                        <span>Technical Skills</span>
                        <span className="skill-rating">{review.technical_skills}/5</span>
                      </div>
                      <div className="skill-item">
                        <span>Communication</span>
                        <span className="skill-rating">{review.communication}/5</span>
                      </div>
                      <div className="skill-item">
                        <span>Teamwork</span>
                        <span className="skill-rating">{review.teamwork}/5</span>
                      </div>
                      <div className="skill-item">
                        <span>Leadership</span>
                        <span className="skill-rating">{review.leadership}/5</span>
                      </div>
                    </div>

                    {review.comments && (
                      <div className="review-content">
                        <h5>Comments</h5>
                        <p>{review.comments}</p>
                      </div>
                    )}

                    {review.strengths && (
                      <div className="review-content">
                        <h5>Strengths</h5>
                        <p>{review.strengths}</p>
                      </div>
                    )}

                    {review.improvement_areas && (
                      <div className="review-content">
                        <h5>Areas for Improvement</h5>
                        <p>{review.improvement_areas}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No Performance Reviews</h3>
                <p>Your performance reviews will appear here once completed by your manager</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills Analysis Tab */}
      {activeTab === 'skills' && (
        <div className="skills-section">
          <div className="section-header">
            <h3>Skills Performance Analysis</h3>
            <p>Detailed breakdown of your skill ratings from the latest review</p>
          </div>

          {Object.keys(stats.skillsBreakdown).length > 0 ? (
            <div className="skills-analysis">
              <div className="skills-radar-container">
                <h4>Skills Breakdown</h4>
                <div className="skills-bars">
                  {Object.entries(stats.skillsBreakdown).map(([skill, rating]) => (
                    <div key={skill} className="skill-bar-item">
                      <div className="skill-info">
                        <span className="skill-name">{getSkillLabel(skill)}</span>
                        <span className="skill-score">{rating}/5</span>
                      </div>
                      <div className="skill-bar">
                        <div 
                          className="skill-bar-fill"
                          style={{ 
                            width: `${(rating / 5) * 100}%`,
                            backgroundColor: getRatingColor(rating)
                          }}
                        ></div>
                      </div>
                      <div className="skill-rating-text">{getRatingText(rating)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills Improvement Recommendations */}
              <div className="improvement-recommendations">
                <h4>Focus Areas</h4>
                {Object.entries(stats.skillsBreakdown)
                  .filter(([skill, rating]) => rating < 4)
                  .sort(([,a], [,b]) => a - b)
                  .slice(0, 3)
                  .map(([skill, rating]) => (
                    <div key={skill} className="improvement-item">
                      <div className="improvement-skill">{getSkillLabel(skill)}</div>
                      <div className="improvement-current">Current: {rating}/5</div>
                      <div className="improvement-suggestion">
                        Consider focusing on improving this skill area
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Skills Data</h3>
              <p>Skills analysis will be available after your first performance review</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PerformanceDashboard
