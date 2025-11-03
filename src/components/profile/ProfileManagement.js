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
    profile_photo_url: '',
    documents: [] // Store documents as array of {name, url, uploaded_at}
  })
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  
  // Document upload states
  const [docFile, setDocFile] = useState(null)
  const [docName, setDocName] = useState('')
  const [showDocModal, setShowDocModal] = useState(false)

  useEffect(() => {
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
        profile_photo_url: data.profile_photo_url || '',
        documents: data.documents || []
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
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/pjpeg']
    const hasValidMimeType = validMimeTypes.includes(file.type)
    return hasValidExtension || hasValidMimeType
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setMessage('')
    setMessageType('')

    if (!validateImageFile(file)) {
      setMessage(`File type "${file.type}" is not allowed. Only JPG and PNG files are accepted.`)
      setMessageType('error')
      event.target.value = null
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage('File size must be less than 2MB')
      setMessageType('error')
      event.target.value = null
      return
    }

    setUploadingPhoto(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `profile-photos/${employee.id}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('employees')
        .update({ profile_photo_url: publicUrl })
        .eq('id', employee.id)

      if (updateError) throw updateError

      setProfileData(prev => ({ ...prev, profile_photo_url: publicUrl }))
      
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

  // Document upload handler
  const handleDocumentUpload = async () => {
    if (!docFile || !docName.trim()) {
      setMessage('Please select a file and provide a document name')
      setMessageType('error')
      return
    }

    setUploadingDoc(true)
    setMessage('')

    try {
      const fileExt = docFile.name.split('.').pop()
      const fileName = `employee-documents/${employee.id}/${Date.now()}_${docName}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, docFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName)

      const newDocument = {
        name: docName.trim(),
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
        file_type: fileExt
      }

      const updatedDocuments = [...profileData.documents, newDocument]

      const { error: updateError } = await supabase
        .from('employees')
        .update({ documents: updatedDocuments })
        .eq('id', employee.id)

      if (updateError) throw updateError

      setProfileData(prev => ({ ...prev, documents: updatedDocuments }))
      setMessage(`Document "${docName}" uploaded successfully!`)
      setMessageType('success')
      
      // Reset form
      setDocFile(null)
      setDocName('')
      setShowDocModal(false)

    } catch (error) {
      console.error('Document upload error:', error)
      setMessage('Error uploading document: ' + error.message)
      setMessageType('error')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (index) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return

    try {
      const updatedDocuments = profileData.documents.filter((_, i) => i !== index)

      const { error } = await supabase
        .from('employees')
        .update({ documents: updatedDocuments })
        .eq('id', employee.id)

      if (error) throw error

      setProfileData(prev => ({ ...prev, documents: updatedDocuments }))
      setMessage('Document deleted successfully!')
      setMessageType('success')

    } catch (error) {
      console.error('Delete error:', error)
      setMessage('Error deleting document: ' + error.message)
      setMessageType('error')
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
          profile_photo_url: profileData.profile_photo_url
        })
        .eq('id', employee.id)

      if (error) throw error

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
      <div className="profile-header-enhanced">
        <div className="profile-header-content">
          <h1>👤 My Profile</h1>
          <p>Manage your personal information, documents, and settings</p>
        </div>
      </div>

      {message && (
        <div className={`alert-modern ${messageType}`}>
          <span className="alert-icon">{messageType === 'success' ? '✅' : '⚠️'}</span>
          <span>{message}</span>
        </div>
      )}

      <div className="profile-grid-enhanced">
        {/* Profile Photo Card */}
        <div className="card-enhanced photo-card">
          <div className="card-header-enhanced">
            <h3>📸 Profile Photo</h3>
          </div>
          <div className="photo-section-enhanced">
            <div className="photo-preview">
              {profileData.profile_photo_url ? (
                <img src={profileData.profile_photo_url} alt="Profile" className="profile-img-large" />
              ) : (
                <div className="avatar-placeholder-large">
                  {employee.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="upload-zone">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="file-input-hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="btn-upload-modern">
                {uploadingPhoto ? '⏳ Uploading...' : '📤 Upload Photo'}
              </label>
              <p className="upload-info">JPG, PNG • Max 2MB</p>
            </div>
          </div>
        </div>

        {/* Documents Card */}
        <div className="card-enhanced documents-card">
          <div className="card-header-enhanced">
            <h3>📁 My Documents</h3>
            <button 
              className="btn-add-doc" 
              onClick={() => setShowDocModal(true)}
            >
              + Add Document
            </button>
          </div>
          <div className="documents-list">
            {profileData.documents?.length > 0 ? (
              profileData.documents.map((doc, index) => (
                <div key={index} className="document-item">
                  <div className="doc-icon">📄</div>
                  <div className="doc-details">
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-meta">
                      {new Date(doc.uploaded_at).toLocaleDateString()} • {doc.file_type?.toUpperCase()}
                    </div>
                  </div>
                  <div className="doc-actions">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-doc-action">
                      👁️
                    </a>
                    <button onClick={() => handleDeleteDocument(index)} className="btn-doc-action danger">
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>📂 No documents uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="card-enhanced full-width">
          <div className="card-header-enhanced">
            <h3>✏️ Personal Information</h3>
          </div>
          <form onSubmit={handleSubmit} className="profile-form-enhanced">
            <div className="form-row">
              <div className="form-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full">
                <label>Current Address</label>
                <textarea
                  name="address_current"
                  value={profileData.address_current}
                  onChange={handleInputChange}
                  placeholder="Street, City, State, PIN"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full">
                <label>Permanent Address</label>
                <textarea
                  name="address_permanent"
                  value={profileData.address_permanent}
                  onChange={handleInputChange}
                  placeholder="Street, City, State, PIN"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Wedding Anniversary</label>
                <input
                  type="date"
                  name="wedding_anniversary"
                  value={profileData.wedding_anniversary}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="section-divider">
              <h4>💳 Bank Details</h4>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Account Holder Name</label>
                <input
                  type="text"
                  name="bank_account_holder_name"
                  value={profileData.bank_details.account_holder_name}
                  onChange={handleInputChange}
                  placeholder="As per bank records"
                />
              </div>
              <div className="form-field">
                <label>Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={profileData.bank_details.account_number}
                  onChange={handleInputChange}
                  placeholder="XXXX XXXX XXXX"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bank_bank_name"
                  value={profileData.bank_details.bank_name}
                  onChange={handleInputChange}
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div className="form-field">
                <label>IFSC Code</label>
                <input
                  type="text"
                  name="bank_ifsc_code"
                  value={profileData.bank_details.ifsc_code}
                  onChange={handleInputChange}
                  placeholder="e.g., HDFC0001234"
                />
              </div>
            </div>

            <div className="form-actions-enhanced">
              <button type="submit" className="btn-primary-enhanced" disabled={loading}>
                {loading ? '⏳ Updating...' : '💾 Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Employment Details (Read-only) */}
        <div className="card-enhanced full-width">
          <div className="card-header-enhanced">
            <h3>🏢 Employment Details</h3>
            <span className="badge-readonly">Read Only</span>
          </div>
          <div className="info-grid-enhanced">
            <div className="info-item">
              <span className="info-label">Employee ID</span>
              <span className="info-value">{employee.employee_id || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{employee.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Department</span>
              <span className="info-value">{employee.department || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role</span>
              <span className="info-value">{employee.role || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Joining Date</span>
              <span className="info-value">
                {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Salary</span>
              <span className="info-value">
                {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">
                <span className={`status-badge-enhanced ${employee.is_active ? 'active' : 'inactive'}`}>
                  {employee.is_active ? '✅ Active' : '❌ Inactive'}
                </span>
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Date of Birth</span>
              <span className="info-value">
                {employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">PAN</span>
              <span className="info-value">{employee.pan || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Aadhar</span>
              <span className="info-value">
                {employee.aadhar ? `****-****-${employee.aadhar.slice(-4)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal-content-enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-enhanced">
              <h3>📤 Upload Document</h3>
              <button className="modal-close" onClick={() => setShowDocModal(false)}>✕</button>
            </div>
            <div className="modal-body-enhanced">
              <div className="form-field">
                <label>Document Name *</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g., Aadhar Card, PAN Card, Resume"
                />
              </div>
              <div className="form-field">
                <label>Choose File *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDocFile(e.target.files[0])}
                />
                {docFile && <p className="file-selected">✅ {docFile.name}</p>}
              </div>
            </div>
            <div className="modal-actions-enhanced">
              <button onClick={() => setShowDocModal(false)} className="btn-cancel-enhanced">
                Cancel
              </button>
              <button 
                onClick={handleDocumentUpload} 
                className="btn-primary-enhanced"
                disabled={uploadingDoc || !docFile || !docName}
              >
                {uploadingDoc ? '⏳ Uploading...' : '📤 Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileManagement
