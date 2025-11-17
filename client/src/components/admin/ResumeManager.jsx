import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Spinner, Row, Col, Badge, Modal, Form, Table } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ResumeManager = () => {
  const [currentResume, setCurrentResume] = useState(null);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);
  const [resumeContent, setResumeContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Image cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imageAdjustments, setImageAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0
  });
  
  // Manual editing states
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingExperience, setEditingExperience] = useState(null);
  const [educationForm, setEducationForm] = useState({
    degree: '',
    institution: '',
    location: '',
    period: '',
    description: '',
    gpa: ''
  });
  const [experienceForm, setExperienceForm] = useState({
    position: '',
    company: '',
    location: '',
    period: '',
    description: '',
    achievements: ''
  });

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  
  const { user, logout } = useAuth();

  const getBaseUrl = () => {
    return 'http://localhost:5000';
  };

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  useEffect(() => {
    if (user) {
      fetchCurrentResume();
      fetchCurrentProfileImage();
      fetchResumeContent();
    }
  }, [user]);

  // Update canvas when crop changes
  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      generateCroppedImage();
    }
  }, [completedCrop, imageAdjustments]);

  const generateCroppedImage = () => {
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    
    if (!image || !canvas || !completedCrop) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio;

    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    // Apply filters
    ctx.filter = `
      brightness(${imageAdjustments.brightness}%)
      contrast(${imageAdjustments.contrast}%)
      saturate(${imageAdjustments.saturation}%)
    `;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );
  };

  const fetchCurrentResume = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      const response = await axios.get(`${getBaseUrl()}/api/admin/resume`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setCurrentResume(response.data);
    } catch (error) {
      console.log('No resume found or error fetching resume:', error.response?.data || error.message);
      setCurrentResume(null);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'danger', text: 'Authentication failed. Please log in again.' });
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchResumeContent = async () => {
    try {
      const response = await axios.get(`${getBaseUrl()}/api/resume/content`);
      console.log('📊 Resume Content Response:', response.data);
      
      // Check if we have valid content
      if (response.data && (response.data.education || response.data.experience || response.data.skills)) {
        const hasEducation = response.data.education && response.data.education.length > 0;
        const hasExperience = response.data.experience && response.data.experience.length > 0;
        const hasSkills = response.data.skills && response.data.skills.length > 0;
        
        if (hasEducation || hasExperience || hasSkills) {
          setResumeContent(response.data);
          console.log('✅ Resume content loaded successfully');
        } else {
          console.log('ℹ️ No valid resume content found');
          setResumeContent(null);
        }
      } else {
        console.log('ℹ️ No resume content data in response');
        setResumeContent(null);
      }
    } catch (error) {
      console.log('No resume content available:', error.response?.data || error.message);
      setResumeContent(null);
    }
  };

  const fetchCurrentProfileImage = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const response = await axios.get(`${getBaseUrl()}/api/admin/profile-image`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setCurrentProfileImage(response.data);
    } catch (error) {
      console.log('No profile image found or error fetching image:', error.response?.data || error.message);
      setCurrentProfileImage(null);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  };

  // ==================== MANUAL EDUCATION MANAGEMENT ====================

  const openEducationModal = (education = null) => {
    if (education) {
      setEducationForm({
        degree: education.degree || '',
        institution: education.institution || '',
        location: education.location || '',
        period: education.period || '',
        description: education.description || '',
        gpa: education.gpa || ''
      });
      setEditingEducation(education.id);
    } else {
      setEducationForm({
        degree: '',
        institution: '',
        location: '',
        period: '',
        description: '',
        gpa: ''
      });
      setEditingEducation(null);
    }
    setShowEducationModal(true);
  };

  const handleEducationSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const token = getAuthToken();
      
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      const response = await axios.post(
        `${getBaseUrl()}/api/admin/resume/education`,
        {
          ...educationForm,
          id: editingEducation
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage({ type: 'success', text: response.data.message });
      setShowEducationModal(false);
      await fetchResumeContent();
    } catch (error) {
      console.error('Error saving education:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to save education' 
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteEducation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this education entry?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      await axios.delete(`${getBaseUrl()}/api/admin/resume/education/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMessage({ type: 'success', text: 'Education entry deleted successfully' });
      await fetchResumeContent();
    } catch (error) {
      console.error('Error deleting education:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to delete education' 
      });
    }
  };

  // ==================== MANUAL EXPERIENCE MANAGEMENT ====================

  const openExperienceModal = (experience = null) => {
    if (experience) {
      setExperienceForm({
        position: experience.position || '',
        company: experience.company || '',
        location: experience.location || '',
        period: experience.period || '',
        description: experience.description || '',
        achievements: Array.isArray(experience.achievements) 
          ? experience.achievements.join('\n') 
          : (experience.achievements || '')
      });
      setEditingExperience(experience.id);
    } else {
      setExperienceForm({
        position: '',
        company: '',
        location: '',
        period: '',
        description: '',
        achievements: ''
      });
      setEditingExperience(null);
    }
    setShowExperienceModal(true);
  };

  const handleExperienceSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const token = getAuthToken();
      
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      const response = await axios.post(
        `${getBaseUrl()}/api/admin/resume/experience`,
        {
          ...experienceForm,
          id: editingExperience
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage({ type: 'success', text: response.data.message });
      setShowExperienceModal(false);
      await fetchResumeContent();
    } catch (error) {
      console.error('Error saving experience:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to save experience' 
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteExperience = async (id) => {
    if (!window.confirm('Are you sure you want to delete this experience entry?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      await axios.delete(`${getBaseUrl()}/api/admin/resume/experience/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMessage({ type: 'success', text: 'Experience entry deleted successfully' });
      await fetchResumeContent();
    } catch (error) {
      console.error('Error deleting experience:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.error || 'Failed to delete experience' 
      });
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'danger', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'danger', text: 'Image size must be less than 5MB' });
      return;
    }

    // Reset adjustments and crop for new image
    setImageAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      rotation: 0
    });
    
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    
    // Clear file input
    event.target.value = '';
  };

  const handleCropComplete = async () => {
    if (!previewCanvasRef.current) {
      setMessage({ type: 'danger', text: 'Please crop the image first' });
      return;
    }

    try {
      setUploading(true);
      
      previewCanvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setMessage({ type: 'danger', text: 'Failed to process image' });
          return;
        }

        const formData = new FormData();
        formData.append('profileImage', blob, 'profile-image.jpg');

        const token = getAuthToken();
        if (!token) {
          setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
          return;
        }

        const response = await axios.post(`${getBaseUrl()}/api/admin/update-profile-image`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        setCurrentProfileImage(response.data.image);
        setMessage({ type: 'success', text: 'Profile image updated successfully!' });
        setShowCropModal(false);
        setSelectedImage(null);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error('Error uploading profile image:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update profile image';
      setMessage({ type: 'danger', text: errorMessage });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'danger', text: 'Authentication failed. Please log in again.' });
        logout();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setMessage({ type: 'danger', text: 'Please select a PDF file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'danger', text: 'File size must be less than 10MB' });
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploading(true);
      setMessage({ type: '', text: '' });
      
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      console.log('📤 Starting resume upload...');
      const response = await axios.post(`${getBaseUrl()}/api/admin/upload-resume`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      console.log('✅ Resume upload response:', response.data);
      
      setCurrentResume(response.data.resume);
      setMessage({ type: 'success', text: response.data.message || 'Resume uploaded and processed successfully!' });
      
      // Refresh resume content after a short delay to allow processing
      setTimeout(async () => {
        await fetchResumeContent();
      }, 2000);
      
      event.target.value = '';
    } catch (error) {
      console.error('❌ Error uploading resume:', error);
      
      let errorMessage = 'Failed to upload resume';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'danger', text: errorMessage });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'danger', text: 'Authentication failed. Please log in again.' });
        logout();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the current resume? This action cannot be undone.')) {
      return;
    }

    try {
      setUploading(true);
      const token = getAuthToken();
      
      if (!token) {
        setMessage({ type: 'danger', text: 'Authentication token missing. Please log in again.' });
        return;
      }

      const response = await axios.delete(`${getBaseUrl()}/api/admin/delete-resume`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setCurrentResume(null);
      setResumeContent(null);
      setMessage({ type: 'success', text: 'Resume deleted successfully!' });
      
    } catch (error) {
      console.error('Error deleting resume:', error);
      let errorMessage = 'Failed to delete resume';
      
      if (error.response?.status === 404) {
        errorMessage = 'No resume found to delete';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setMessage({ type: 'danger', text: errorMessage });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage({ type: 'danger', text: 'Authentication failed. Please log in again.' });
        logout();
      }
    } finally {
      setUploading(false);
    }
  };

  const resetAdjustments = () => {
    setImageAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      rotation: 0
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResumeView = () => {
    if (currentResume?.url) {
      window.open(`${getBaseUrl()}${currentResume.url}`, '_blank');
    }
  };

  const refreshResumeContent = async () => {
    await fetchResumeContent();
    setMessage({ type: 'info', text: 'Resume content refreshed!' });
  };

  const hasResumeContent = () => {
    if (!resumeContent) return false;
    
    const hasEducation = resumeContent.education && resumeContent.education.length > 0;
    const hasExperience = resumeContent.experience && resumeContent.experience.length > 0;
    const hasSkills = resumeContent.skills && resumeContent.skills.length > 0;
    
    return hasEducation || hasExperience || hasSkills;
  };

  if (!user) {
    return (
      <div className="text-center py-5">
        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
          style={{ width: '80px', height: '80px' }}>
          <i className="fas fa-lock text-muted fa-2x"></i>
        </div>
        <h5 className="text-dark mb-3">Authentication Required</h5>
        <p className="text-muted mb-4">Please log in to access the resume manager.</p>
        <Button variant="primary" href="/login">
          <i className="fas fa-sign-in-alt me-2"></i>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="fw-bold text-dark mb-1">Resume & Profile Management</h4>
              <p className="text-muted mb-0">
                Welcome back, <span className="fw-medium text-primary">{user.username || user.email}</span>
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-info" size="sm" onClick={refreshResumeContent}>
                <i className="fas fa-sync-alt me-2"></i>
                Refresh Content
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={logout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {message.text && (
        <Alert variant={message.type} className="mb-4" dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Row>
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-primary text-white py-3">
              <h5 className="mb-0 fw-bold">
                <i className="fas fa-file-pdf me-2"></i>
                Resume Management
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Loading resume info...</p>
                </div>
              ) : currentResume ? (
                <div className="text-center">
                  <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                    style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-file-pdf text-danger fa-2x"></i>
                  </div>
                  <h6 className="fw-bold mb-2">{currentResume.originalName || currentResume.filename}</h6>
                  <div className="mb-3">
                    <Badge bg="secondary" className="me-2">
                      {formatFileSize(currentResume.size)}
                    </Badge>
                    <Badge bg="info">
                      Updated: {formatDate(currentResume.uploadedAt || currentResume.lastUpdated)}
                    </Badge>
                  </div>
                  
                  {currentResume && (
                    <div className="mb-3">
                      <Row className="g-2">
                        <Col xs={4}>
                          <Badge bg="success" className="w-100">
                            <i className="fas fa-graduation-cap me-1"></i>
                            {currentResume.educationCount || 0}
                          </Badge>
                        </Col>
                        <Col xs={4}>
                          <Badge bg="warning" className="w-100 text-dark">
                            <i className="fas fa-briefcase me-1"></i>
                            {currentResume.experienceCount || 0}
                          </Badge>
                        </Col>
                        <Col xs={4}>
                          <Badge bg="danger" className="w-100">
                            <i className="fas fa-star me-1"></i>
                            {currentResume.skillsCount || 0}
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  )}

                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary" 
                      onClick={handleResumeView}
                    >
                      <i className="fas fa-eye me-2"></i>
                      View Resume
                    </Button>
                    <Button 
                      variant="outline-primary"
                      href={`${getBaseUrl()}/api/resume`}
                      download={currentResume.originalName || currentResume.filename}
                    >
                      <i className="fas fa-download me-2"></i>
                      Download Resume
                    </Button>
                    <Button 
                      variant="outline-danger"
                      onClick={handleResumeDelete}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash me-2"></i>
                          Delete Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                    style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-file-upload text-muted fa-2x"></i>
                  </div>
                  <p className="text-muted mb-3">No resume uploaded yet</p>
                  <p className="text-muted small">
                    Upload a PDF resume to make it available for download on your portfolio
                  </p>
                </div>
              )}

              <hr className="my-4" />

              <div className="upload-section">
                <label className="form-label fw-medium">Upload New Resume</label>
                <p className="text-muted small mb-3">
                  Upload a PDF file (max 10MB) to replace the current resume
                </p>
                <div className="d-grid">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    className="form-control"
                    id="resumeUpload"
                  />
                  <label htmlFor="resumeUpload" className="btn btn-primary mt-2">
                    {uploading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload me-2"></i>
                        {currentResume ? 'Replace Resume' : 'Upload Resume'}
                      </>
                    )}
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-success text-white py-3">
              <h5 className="mb-0 fw-bold">
                <i className="fas fa-user-circle me-2"></i>
                Profile Image
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {currentProfileImage ? (
                <div className="text-center">
                  <div className="mb-3">
                    <img 
                      src={`${getBaseUrl()}${currentProfileImage.url}`}
                      alt="Profile"
                      className="rounded-circle shadow"
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                  <h6 className="fw-bold mb-2">Current Profile Image</h6>
                  <div className="mb-3">
                    <Badge bg="secondary" className="me-2">
                      {formatFileSize(currentProfileImage.size)}
                    </Badge>
                    <Badge bg="info">
                      Updated: {formatDate(currentProfileImage.updatedAt)}
                    </Badge>
                  </div>
                  <p className="text-muted small">
                    This image will replace the yellow circle in your portfolio
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                    style={{ width: '150px', height: '150px' }}>
                    <i className="fas fa-user text-muted fa-3x"></i>
                  </div>
                  <p className="text-muted mb-3">No profile image uploaded</p>
                  <p className="text-muted small">
                    Upload an image to replace the default yellow circle in your portfolio
                  </p>
                </div>
              )}

              <hr className="my-4" />

              <div className="upload-section">
                <label className="form-label fw-medium">Update Profile Image</label>
                <p className="text-muted small mb-3">
                  Upload an image file (max 5MB) to update your profile picture
                </p>
                <div className="d-grid">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={uploading}
                    className="form-control"
                    id="profileImageUpload"
                  />
                  <label htmlFor="profileImageUpload" className="btn btn-success mt-2">
                    <i className="fas fa-camera me-2"></i>
                    {currentProfileImage ? 'Replace Image' : 'Upload Profile Image'}
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resume Content Preview with Manual Editing */}
      {(hasResumeContent() || currentResume) && (
        <Row className="mt-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-info text-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="fas fa-file-alt me-2"></i>
                    Resume Content Preview & Management
                  </h5>
                  <Badge bg="light" text="dark">
                    Auto-extracted from PDF + Manual Editing
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row>
                  {/* Education Section with Edit Options */}
                  <Col md={6} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold text-primary mb-0">
                        <i className="fas fa-graduation-cap me-2"></i>
                        Education {resumeContent?.education ? `(${resumeContent.education.length})` : '(0)'}
                      </h6>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => openEducationModal()}
                        disabled={!currentResume}
                      >
                        <i className="fas fa-plus me-1"></i>
                        Add New
                      </Button>
                    </div>
                    
                    {resumeContent?.education && resumeContent.education.length > 0 ? (
                      <div className="table-responsive">
                        <Table bordered size="sm">
                          <thead className="bg-light">
                            <tr>
                              <th>Degree</th>
                              <th>Institution</th>
                              <th>Period</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumeContent.education.map((edu, index) => (
                              <tr key={index}>
                                <td className="fw-medium">{edu.degree}</td>
                                <td>{edu.institution}</td>
                                <td className="text-muted small">{edu.period}</td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => openEducationModal(edu)}
                                    >Edit
                                      <i className="fas fa-edit"></i>
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => deleteEducation(edu.id)}
                                    >
                                      Delete
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-light rounded">
                        <i className="fas fa-graduation-cap text-muted fa-2x mb-3"></i>
                        <p className="text-muted mb-0">No education entries found</p>
                        {currentResume && (
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => openEducationModal()}
                          >
                            Add First Education Entry
                          </Button>
                        )}
                      </div>
                    )}
                  </Col>

                  {/* Experience Section with Edit Options */}
                  <Col md={6} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold text-success mb-0">
                        <i className="fas fa-briefcase me-2"></i>
                        Experience {resumeContent?.experience ? `(${resumeContent.experience.length})` : '(0)'}
                      </h6>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => openExperienceModal()}
                        disabled={!currentResume}
                      >
                        <i className="fas fa-plus me-1"></i>
                        Add New
                      </Button>
                    </div>
                    
                    {resumeContent?.experience && resumeContent.experience.length > 0 ? (
                      <div className="table-responsive">
                        <Table bordered size="sm">
                          <thead className="bg-light">
                            <tr>
                              <th>Position</th>
                              <th>Company</th>
                              <th>Period</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumeContent.experience.map((exp, index) => (
                              <tr key={index}>
                                <td className="fw-medium">{exp.position}</td>
                                <td>{exp.company}</td>
                                <td className="text-muted small">{exp.period}</td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => openExperienceModal(exp)}
                                    >
                                      Edit
                                      <i className="fas fa-edit"></i>
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => deleteExperience(exp.id)}
                                    >
                                      Delete
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-light rounded">
                        <i className="fas fa-briefcase text-muted fa-2x mb-3"></i>
                        <p className="text-muted mb-0">No experience entries found</p>
                        {currentResume && (
                          <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => openExperienceModal()}
                          >
                            Add First Experience Entry
                          </Button>
                        )}
                      </div>
                    )}
                  </Col>

                  {/* Skills Section */}
                  {resumeContent?.skills && resumeContent.skills.length > 0 && (
                    <Col md={12}>
                      <h6 className="fw-bold text-warning mb-3">
                        <i className="fas fa-star me-2"></i>
                        Skills ({resumeContent.skills.length} categories)
                      </h6>
                      <Row>
                        {resumeContent.skills.map((skillCategory, index) => (
                          <Col md={6} key={index} className="mb-3">
                            <Card className="border">
                              <Card.Header className="bg-light py-2">
                                <strong className="small">{skillCategory.category}</strong>
                              </Card.Header>
                              <Card.Body className="p-2">
                                <div className="d-flex flex-wrap gap-1">
                                  {skillCategory.skills && skillCategory.skills.map((skill, skillIndex) => (
                                    <Badge key={skillIndex} bg="outline-primary" className="text-dark border" style={{fontSize: '0.7rem'}}>
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* No Resume Content Message */}
      {currentResume && !hasResumeContent() && (
        <Row className="mt-4">
          <Col md={12}>
            <Card className="border-0 bg-warning bg-opacity-10">
              <Card.Body className="text-center py-4">
                <i className="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
                <h6 className="fw-bold text-warning mb-2">No Content Extracted</h6>
                <p className="text-muted mb-3">
                  The resume was uploaded successfully, but no content could be automatically extracted.
                  You can manually add education and experience entries using the buttons above.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="outline-warning" size="sm" onClick={refreshResumeContent}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Try Extracting Again
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => openEducationModal()}>
                    <i className="fas fa-plus me-2"></i>
                    Add Education Manually
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Education Modal */}
      <Modal show={showEducationModal} onHide={() => setShowEducationModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-graduation-cap me-2"></i>
            {editingEducation ? 'Edit Education' : 'Add Education'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEducationSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Degree *</Form.Label>
              <Form.Control
                type="text"
                value={educationForm.degree}
                onChange={(e) => setEducationForm({...educationForm, degree: e.target.value})}
                required
                placeholder="e.g., Bachelor of Technology in Computer Science"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Institution *</Form.Label>
              <Form.Control
                type="text"
                value={educationForm.institution}
                onChange={(e) => setEducationForm({...educationForm, institution: e.target.value})}
                required
                placeholder="e.g., University of Example"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={educationForm.location}
                    onChange={(e) => setEducationForm({...educationForm, location: e.target.value})}
                    placeholder="e.g., City, Country"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Period *</Form.Label>
                  <Form.Control
                    type="text"
                    value={educationForm.period}
                    onChange={(e) => setEducationForm({...educationForm, period: e.target.value})}
                    required
                    placeholder="e.g., 2020-2024"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>GPA/Score</Form.Label>
              <Form.Control
                type="text"
                value={educationForm.gpa}
                onChange={(e) => setEducationForm({...educationForm, gpa: e.target.value})}
                placeholder="e.g., 3.8/4.0 or 90%"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={educationForm.description}
                onChange={(e) => setEducationForm({...educationForm, description: e.target.value})}
                placeholder="Additional details about your education..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowEducationModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingEducation ? 'Update' : 'Save'} Education
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Experience Modal */}
      <Modal show={showExperienceModal} onHide={() => setShowExperienceModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-briefcase me-2"></i>
            {editingExperience ? 'Edit Experience' : 'Add Experience'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleExperienceSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Position *</Form.Label>
              <Form.Control
                type="text"
                value={experienceForm.position}
                onChange={(e) => setExperienceForm({...experienceForm, position: e.target.value})}
                required
                placeholder="e.g., Full Stack Developer"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Company *</Form.Label>
              <Form.Control
                type="text"
                value={experienceForm.company}
                onChange={(e) => setExperienceForm({...experienceForm, company: e.target.value})}
                required
                placeholder="e.g., Tech Company Inc"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={experienceForm.location}
                    onChange={(e) => setExperienceForm({...experienceForm, location: e.target.value})}
                    placeholder="e.g., City, Country"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Period *</Form.Label>
                  <Form.Control
                    type="text"
                    value={experienceForm.period}
                    onChange={(e) => setExperienceForm({...experienceForm, period: e.target.value})}
                    required
                    placeholder="e.g., Jan 2023 - Present"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({...experienceForm, description: e.target.value})}
                placeholder="Describe your responsibilities and role..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Achievements (one per line)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={experienceForm.achievements}
                onChange={(e) => setExperienceForm({...experienceForm, achievements: e.target.value})}
                placeholder="List your key achievements, one per line..."
              />
              <Form.Text className="text-muted">
                Each line will be treated as a separate achievement/bullet point
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowExperienceModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingExperience ? 'Update' : 'Save'} Experience
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Image Cropping Modal */}
      <Modal show={showCropModal} onHide={() => setShowCropModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            <i className="fas fa-crop me-2"></i>
            Crop & Adjust Profile Image
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              {selectedImage && (
                <div className="crop-container mb-3">
                  <ReactCrop
                    crop={crop}
                    onChange={(newCrop) => setCrop(newCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={selectedImage}
                      alt="Crop preview"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px',
                        filter: `
                          brightness(${imageAdjustments.brightness}%)
                          contrast(${imageAdjustments.contrast}%)
                          saturate(${imageAdjustments.saturation}%)
                        `,
                        transform: `rotate(${imageAdjustments.rotation}deg)`
                      }}
                      onLoad={() => setCompletedCrop(crop)}
                    />
                  </ReactCrop>
                </div>
              )}
            </Col>
            <Col md={4}>
              <h6 className="fw-bold mb-3">Image Adjustments</h6>
              
              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium">
                  Brightness: {imageAdjustments.brightness}%
                </Form.Label>
                <Form.Range
                  min="0"
                  max="200"
                  value={imageAdjustments.brightness}
                  onChange={(e) => setImageAdjustments(prev => ({
                    ...prev,
                    brightness: parseInt(e.target.value)
                  }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium">
                  Contrast: {imageAdjustments.contrast}%
                </Form.Label>
                <Form.Range
                  min="0"
                  max="200"
                  value={imageAdjustments.contrast}
                  onChange={(e) => setImageAdjustments(prev => ({
                    ...prev,
                    contrast: parseInt(e.target.value)
                  }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium">
                  Saturation: {imageAdjustments.saturation}%
                </Form.Label>
                <Form.Range
                  min="0"
                  max="200"
                  value={imageAdjustments.saturation}
                  onChange={(e) => setImageAdjustments(prev => ({
                    ...prev,
                    saturation: parseInt(e.target.value)
                  }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium">
                  Rotation: {imageAdjustments.rotation}°
                </Form.Label>
                <Form.Range
                  min="-180"
                  max="180"
                  value={imageAdjustments.rotation}
                  onChange={(e) => setImageAdjustments(prev => ({
                    ...prev,
                    rotation: parseInt(e.target.value)
                  }))}
                />
              </Form.Group>

              <div className="d-grid gap-2">
                <Button variant="outline-secondary" size="sm" onClick={resetAdjustments}>
                  <i className="fas fa-undo me-1"></i>
                  Reset Adjustments
                </Button>
              </div>

              <div className="mt-4">
                <h6 className="fw-bold mb-2">Preview</h6>
                <div className="text-center">
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      border: '2px solid #dee2e6'
                    }}
                  />
                  <small className="text-muted d-block mt-2">
                    Circular crop preview
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCropModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleCropComplete}
            disabled={uploading || !completedCrop}
          >
            {uploading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Apply Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Instructions */}
      <Row className="mt-4">
        <Col md={12}>
          <Card className="border-0 bg-light">
            <Card.Body className="p-4">
              <h6 className="fw-bold text-dark mb-3">
                <i className="fas fa-info-circle me-2 text-primary"></i>
                Instructions
              </h6>
              <Row>
                <Col md={6}>
                  <ul className="text-muted small">
                    <li>Resume must be in PDF format (max 10MB)</li>
                    <li>Profile image should be a square image for best results</li>
                    <li>Supported image formats: JPG, PNG, GIF, WebP</li>
                    <li>Use the crop tool to create a perfect circular profile picture</li>
                    <li>Education, experience, and skills are automatically extracted from your resume</li>
                    <li>You can manually add, edit, or delete education and experience entries</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <ul className="text-muted small">
                    <li>Resume will be available for download on your portfolio</li>
                    <li>Profile image replaces the yellow circle in the hero section</li>
                    <li>Adjust brightness, contrast, and saturation for best results</li>
                    <li>Changes are reflected immediately on your live portfolio</li>
                    <li>Use "Refresh Content" to update the extracted information</li>
                    <li>Manual edits are saved separately and won't be overwritten by PDF uploads</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ResumeManager;