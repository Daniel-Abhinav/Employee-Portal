import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const ProfileManagement = ({ employee, onProfileUpdate }) => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address_permanent: '',
    address_current: '',
    bank_details: {
      account_number: '',
      bank_name: '',
      ifsc_code: '',
      account_holder_name: ''
    },
    wedding_anniversary: '',
    profile_photo_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    // Load fresh employee data including photo URL from database
    fetchEmployeeData()
  }, [employee.id])

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employee.id)
        .single()

      if (error) throw error

      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address_permanent: data.address_permanent || '',
        address_current: data.address_current || '',
        bank_details: data.bank_details || {
          account_number: '',
          bank_name: '',
          ifsc_code: '',
          account_holder_name: ''
        },
        wedding_anniversary: data.wedding_anniversary || '',
        profile_photo_url: data.profile_photo_url || '' // This persists the photo
      })
    } catch (error) {
      console.error('Error fetching employee data:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('bank_')) {
      const bankField = name.replace('bank_', '')
      setProfileData(prev => ({
        ...prev,
        bank_details: {
          ...prev.bank_details,
          [bankField]: value
        }
      }))
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const validateImageFile = (file) => {
    // Check file extension (most reliable)
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    // Check MIME type (includes all possible variations)
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/pjpeg' // Sometimes used for JPEG
    ]
    const hasValidMimeType = validMimeTypes.includes(file.type)
    
    // Return true if either check passes
    return hasValidExtension || hasValidMimeType
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Clear previous messages
    setMessage('')
    setMessageType('')

    // Debug logging (remove in production)
    console.log('File upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      extension: file.name.split('.').pop().toLowerCase()
    })

    // Validate file type
    if (!validateImageFile(file)) {
      setMessage(`File type "${file.type}" is not allowed. Only JPG and PNG files are accepted.`)
      setMessageType('error')
      // Clear the input
      event.target.value = null
      return
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage('File size must be less than 2MB')
      setMessageType('error')
      event.target.value = null
      return
    }

    setUploadingPhoto(true)

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `profile-photos/${employee.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName)

      // CRITICAL: Save URL to database immediately
      const { error: updateError } = await supabase
        .from('employees')
        .update({ profile_photo_url: publicUrl })
        .eq('id', employee.id)

      if (updateError) throw updateError

      // Update local state
      setProfileData(prev => ({ ...prev, profile_photo_url: publicUrl }))
      
      // Notify parent component about the update
      if (onProfileUpdate) {
        onProfileUpdate({ ...employee, profile_photo_url: publicUrl })
      }

      setMessage('Photo uploaded successfully!')
      setMessageType('success')

    } catch (error) {
      console.error('Upload error:', error)
      setMessage('Error uploading photo: ' + error.message)
      setMessageType('error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          address_permanent: profileData.address_permanent,
          address_current: profileData.address_current,
          bank_details: profileData.bank_details,
          wedding_anniversary: profileData.wedding_anniversary || null,
          profile_photo_url: profileData.profile_photo_url // Keep the photo URL
        })
        .eq('id', employee.id)

      if (error) throw error

      // Notify parent component about the update
      if (onProfileUpdate) {
        onProfileUpdate({ ...employee, ...profileData })
      }

      setMessage('Profile updated successfully!')
      setMessageType('success')
    } catch (error) {
      setMessage('Error updating profile: ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-modern">
      <div className="profile-header">
        <h2>My Profile</h2>
        <p>Manage your personal information and settings</p>
      </div>

      {message && (
        <div className={`message-modern ${messageType}`}>
          {message}
        </div>
      )}

      <div className="profile-content-grid">
        {/* Photo Upload Section */}
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Profile Photo</h3>
            <p>Upload your profile picture</p>
          </div>
          <div className="photo-upload-section">
            <div className="current-photo">
              {profileData.profile_photo_url ? (
                <img 
                  src={profileData.profile_photo_url} 
                  alt="Profile" 
                  className="profile-image"
                />
              ) : (
                <div className="default-avatar">
                  {employee.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="upload-controls">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="file-input-hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="upload-button">
                {uploadingPhoto ? 'Uploading...' : 'Choose Photo'}
              </label>
              <p className="upload-hint">JPG or PNG, max 2MB</p>
            </div>
          </div>
        </div>

        {/* Editable Information */}
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Personal Information</h3>
            <p>Update your contact and address details</p>
          </div>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group-modern">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group-modern">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group-modern full-width">
                <label>Current Address</label>
                <textarea
                  name="address_current"
                  value={profileData.address_current}
                  onChange={handleInputChange}
                  placeholder="Enter your current address"
                  rows="2"
                />
              </div>

              <div className="form-group-modern full-width">
                <label>Permanent Address</label>
                <textarea
                  name="address_permanent"
                  value={profileData.address_permanent}
                  onChange={handleInputChange}
                  placeholder="Enter your permanent address"
                  rows="2"
                />
              </div>

              <div className="form-group-modern">
                <label>Wedding Anniversary</label>
                <input
                  type="date"
                  name="wedding_anniversary"
                  value={profileData.wedding_anniversary}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="bank-details-section">
              <h4>Bank Details</h4>
              <div className="form-grid">
                <div className="form-group-modern">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    name="bank_account_holder_name"
                    value={profileData.bank_details.account_holder_name}
                    onChange={handleInputChange}
                    placeholder="Full name as per bank"
                  />
                </div>

                <div className="form-group-modern">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={profileData.bank_details.account_number}
                    onChange={handleInputChange}
                    placeholder="Bank account number"
                  />
                </div>

                <div className="form-group-modern">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    name="bank_bank_name"
                    value={profileData.bank_details.bank_name}
                    onChange={handleInputChange}
                    placeholder="Bank name"
                  />
                </div>

                <div className="form-group-modern">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    name="bank_ifsc_code"
                    value={profileData.bank_details.ifsc_code}
                    onChange={handleInputChange}
                    placeholder="Bank IFSC code"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-modern primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Read-only Employment Details */}
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Employment Details</h3>
            <p>Information managed by HR department</p>
          </div>
          <div className="readonly-info-grid">
            <div className="readonly-item">
              <div className="readonly-label">Employee ID</div>
              <div className="readonly-value">{employee.employee_id || 'N/A'}</div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Email</div>
              <div className="readonly-value">{employee.email}</div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Department</div>
              <div className="readonly-value">{employee.department || 'N/A'}</div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Role</div>
              <div className="readonly-value">{employee.role || 'N/A'}</div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Joining Date</div>
              <div className="readonly-value">
                {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Salary</div>
              <div className="readonly-value">
                {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'N/A'}
              </div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Status</div>
              <div className="readonly-value">
                <span className={`status-badge ${employee.is_active ? 'status-success' : 'status-danger'}`}>
                  {employee.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Date of Birth</div>
              <div className="readonly-value">
                {employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">PAN</div>
              <div className="readonly-value">{employee.pan || 'N/A'}</div>
            </div>
            <div className="readonly-item">
              <div className="readonly-label">Aadhar</div>
              <div className="readonly-value">
                {employee.aadhar ? `****-****-${employee.aadhar.slice(-4)}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileManagement
