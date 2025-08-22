import React from 'react'

const Header = ({ employee, onLogout, onToggleSidebar }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* Mobile menu button */}
        <button 
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Header title */}
        <div className="header-title">
          <h1>Employee Management System</h1>
        </div>

        {/* User info and actions */}
        <div className="header-user-section">
          <div className="user-profile-header">
            <div className="user-avatar-header">
              {employee?.profile_photo_url ? (
                <img 
                  src={employee.profile_photo_url} 
                  alt="Profile" 
                  className="user-photo"
                />
              ) : (
                <div className="user-initials">
                  {employee?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="user-details-header">
              <div className="user-name">{employee?.name || 'User'}</div>
              <div className="user-role-header">{employee?.user_role || 'Employee'}</div>
            </div>
          </div>
          
          <button 
            className="sign-out-btn"
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
