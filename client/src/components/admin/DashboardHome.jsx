import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const DashboardHome = () => {
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    skills: 0,
    resumes: 0,
    profileImages: 0,
    adminUsers: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Get the base URL for API calls
  const getBaseUrl = () => {
    return 'http://localhost:5000'; // Backend server URL
  };

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📊 Fetching database stats from /api/test-db...')
      
      const response = await axios.get(`${getBaseUrl()}/api/test-db`, {
        timeout: 10000
      })
      
      console.log('✅ Database stats response:', response.data)
      
      if (response.data.success) {
        setStats({
          users: response.data.users.length,
          projects: response.data.projects_count,
          skills: response.data.skills_count,
          resumes: response.data.resumes_count || 0,
          profileImages: response.data.profile_images_count || 0,
          adminUsers: response.data.users
        })
      } else {
        throw new Error(response.data.error || 'Failed to fetch database stats')
      }
      
    } catch (error) {
      console.error('❌ Error fetching database stats:', error)
      
      if (error.response) {
        setError(`Server error: ${error.response.status}. ${error.response.data?.error || ''}`)
      } else if (error.request) {
        setError('Cannot connect to server. Please check if the backend is running.')
      } else {
        setError('Failed to load dashboard data: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = () => {
    console.log('🔄 Manually refreshing stats...')
    fetchDashboardStats()
  }

  const hasData = stats.projects > 0 || stats.skills > 0 || stats.users > 0

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3 text-muted">Loading database statistics...</p>
      </div>
    )
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">Database Overview</h2>
              <p className="text-muted mb-0">Live statistics from your portfolio database</p>
            </div>
            <Button 
              variant="outline-primary" 
              onClick={refreshStats}
              disabled={loading}
              size="sm"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-2`}></i>
              {loading ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </div>
        </Col>
      </Row>

      {error ? (
        <Alert variant="danger" className="mb-4">
          <div className="d-flex align-items-center">
            <i className="fas fa-database me-2 fs-5"></i>
            <div className="flex-grow-1">
              <strong>Database Connection Error</strong>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        </Alert>
      ) : (
        <>
          {/* Database Stats Cards */}
          <Row className="mb-5">
            <Col md={3} className="mb-4">
              <Card className="border-0 shadow-sm h-100 bg-info text-white">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.users}</h2>
                      <p className="mb-0 opacity-75">Admin Users</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-circle p-3">
                      <i className="fas fa-users fa-2x"></i>
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="opacity-75">
                      {stats.users === 0 
                        ? 'No admin users configured' 
                        : `${stats.users} admin user${stats.users !== 1 ? 's' : ''}`
                      }
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3} className="mb-4">
              <Card className="border-0 shadow-sm h-100 bg-success text-white">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.projects}</h2>
                      <p className="mb-0 opacity-75">Total Projects</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-circle p-3">
                      <i className="fas fa-project-diagram fa-2x"></i>
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="opacity-75">
                      {stats.projects === 0 
                        ? 'No projects in database' 
                        : `${stats.projects} project${stats.projects !== 1 ? 's' : ''} stored`
                      }
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3} className="mb-4">
              <Card className="border-0 shadow-sm h-100 bg-warning text-white">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.skills}</h2>
                      <p className="mb-0 opacity-75">Skills & Technologies</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-circle p-3">
                      <i className="fas fa-cogs fa-2x"></i>
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="opacity-75">
                      {stats.skills === 0 
                        ? 'No skills added yet' 
                        : `${stats.skills} skill${stats.skills !== 1 ? 's' : ''} configured`
                      }
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3} className="mb-4">
              <Card className="border-0 shadow-sm h-100 bg-primary text-white">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.resumes}</h2>
                      <p className="mb-0 opacity-75">Resumes</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-circle p-3">
                      <i className="fas fa-file-pdf fa-2x"></i>
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="opacity-75">
                      {stats.resumes === 0 
                        ? 'No resume uploaded' 
                        : `${stats.resumes} resume uploaded`
                      }
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Database Details Section */}
          <Row>
            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <i className="fas fa-database me-2 text-primary"></i>
                    Database Summary
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="database-summary">
                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-info text-white rounded-circle p-2 me-3">
                          <i className="fas fa-users"></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">Admin Users</p>
                          <small className="text-muted">Registered administrators</small>
                        </div>
                      </div>
                      <Badge bg="info" className="fs-6">
                        {stats.users}
                      </Badge>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-success text-white rounded-circle p-2 me-3">
                          <i className="fas fa-project-diagram"></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">Portfolio Projects</p>
                          <small className="text-muted">Projects in your portfolio</small>
                        </div>
                      </div>
                      <Badge bg="success" className="fs-6">
                        {stats.projects}
                      </Badge>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-warning text-white rounded-circle p-2 me-3">
                          <i className="fas fa-cogs"></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">Skills & Technologies</p>
                          <small className="text-muted">Your technical skills</small>
                        </div>
                      </div>
                      <Badge bg="warning" className="fs-6">
                        {stats.skills}
                      </Badge>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle p-2 me-3">
                          <i className="fas fa-file-pdf"></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">Resumes</p>
                          <small className="text-muted">Uploaded resume files</small>
                        </div>
                      </div>
                      <Badge bg="primary" className="fs-6">
                        {stats.resumes}
                      </Badge>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-danger text-white rounded-circle p-2 me-3">
                          <i className="fas fa-user-circle"></i>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">Profile Images</p>
                          <small className="text-muted">Uploaded profile pictures</small>
                        </div>
                      </div>
                      <Badge bg="danger" className="fs-6">
                        {stats.profileImages}
                      </Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <i className="fas fa-user-shield me-2 text-primary"></i>
                    Admin Users
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  {stats.adminUsers.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-user-slash fa-2x mb-3 opacity-50"></i>
                      <p className="mb-0">No admin users found in database</p>
                    </div>
                  ) : (
                    <div className="admin-users-list">
                      {stats.adminUsers.map((user, index) => (
                        <div key={user.id || index} className="d-flex align-items-center mb-3 p-3 bg-light rounded">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-0 fw-medium">{user.username}</p>
                            <small className="text-muted">{user.email || 'No email'}</small>
                          </div>
                          <Badge bg="outline-primary" className="border border-primary text-primary">
                            ID: {user.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Row>
            <Col md={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <i className="fas fa-rocket me-2 text-primary"></i>
                    Quick Actions
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row>
                    <Col md={3} className="mb-3">
                      <Card className="border h-100 text-center">
                        <Card.Body className="p-4">
                          <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                            <i className="fas fa-project-diagram text-primary fa-lg"></i>
                          </div>
                          <h6 className="fw-bold mb-2">Manage Projects</h6>
                          <p className="text-muted small mb-3">
                            {stats.projects === 0 
                              ? 'Add your first project to showcase your work' 
                              : `Manage ${stats.projects} projects in your portfolio`
                            }
                          </p>
                          <Button 
                            as={Link} 
                            to="/admin/projects" 
                            variant="primary" 
                            size="sm"
                            className="w-100"
                          >
                            <i className="fas fa-arrow-right me-1"></i>
                            Go to Projects
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={3} className="mb-3">
                      <Card className="border h-100 text-center">
                        <Card.Body className="p-4">
                          <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                            <i className="fas fa-cogs text-success fa-lg"></i>
                          </div>
                          <h6 className="fw-bold mb-2">Manage Skills</h6>
                          <p className="text-muted small mb-3">
                            {stats.skills === 0 
                              ? 'Add your technical skills and technologies' 
                              : `Manage ${stats.skills} skills in your portfolio`
                            }
                          </p>
                          <Button 
                            as={Link} 
                            to="/admin/skills" 
                            variant="success" 
                            size="sm"
                            className="w-100"
                          >
                            <i className="fas fa-arrow-right me-1"></i>
                            Go to Skills
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={3} className="mb-3">
                      <Card className="border h-100 text-center">
                        <Card.Body className="p-4">
                          <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                            <i className="fas fa-file-pdf text-info fa-lg"></i>
                          </div>
                          <h6 className="fw-bold mb-2">Manage Resume</h6>
                          <p className="text-muted small mb-3">
                            {stats.resumes === 0 
                              ? 'Upload your resume for portfolio download' 
                              : 'Update or manage your resume file'
                            }
                          </p>
                          <Button 
                            as={Link} 
                            to="/admin/resume" 
                            variant="info" 
                            size="sm"
                            className="w-100"
                          >
                            <i className="fas fa-arrow-right me-1"></i>
                            Manage Resume
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={3} className="mb-3">
                      <Card className="border h-100 text-center">
                        <Card.Body className="p-4">
                          <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                            <i className="fas fa-user-circle text-warning fa-lg"></i>
                          </div>
                          <h6 className="fw-bold mb-2">Profile Image</h6>
                          <p className="text-muted small mb-3">
                            {stats.profileImages === 0 
                              ? 'Upload profile image to replace default avatar' 
                              : 'Update your profile picture'
                            }
                          </p>
                          <Button 
                            as={Link} 
                            to="/admin/resume" 
                            variant="warning" 
                            size="sm"
                            className="w-100"
                          >
                            <i className="fas fa-arrow-right me-1"></i>
                            Update Image
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* File Management Status */}
          <Row className="mt-4">
            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <i className="fas fa-file-pdf me-2 text-primary"></i>
                    Resume Status
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">
                        {stats.resumes > 0 ? 'Resume Available' : 'No Resume Uploaded'}
                      </h6>
                      <p className="text-muted mb-0 small">
                        {stats.resumes > 0 
                          ? 'Your resume is available for download on the portfolio' 
                          : 'Upload a resume to enable download on your portfolio'
                        }
                      </p>
                    </div>
                    <Badge bg={stats.resumes > 0 ? "success" : "secondary"} className="fs-6">
                      <i className={`fas ${stats.resumes > 0 ? 'fa-check-circle' : 'fa-times-circle'} me-1`}></i>
                      {stats.resumes > 0 ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Button 
                      as={Link} 
                      to="/admin/resume" 
                      variant={stats.resumes > 0 ? "outline-primary" : "primary"} 
                      size="sm"
                      className="w-100"
                    >
                      <i className={`fas ${stats.resumes > 0 ? 'fa-edit' : 'fa-upload'} me-2`}></i>
                      {stats.resumes > 0 ? 'Update Resume' : 'Upload Resume'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold text-dark">
                    <i className="fas fa-user-circle me-2 text-primary"></i>
                    Profile Image Status
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">
                        {stats.profileImages > 0 ? 'Custom Image Set' : 'Default Avatar'}
                      </h6>
                      <p className="text-muted mb-0 small">
                        {stats.profileImages > 0 
                          ? 'Your profile image is displayed on the portfolio' 
                          : 'Using default avatar, upload a custom image'
                        }
                      </p>
                    </div>
                    <Badge bg={stats.profileImages > 0 ? "success" : "warning"} className="fs-6">
                      <i className={`fas ${stats.profileImages > 0 ? 'fa-check-circle' : 'fa-user'} me-1`}></i>
                      {stats.profileImages > 0 ? 'Custom' : 'Default'}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Button 
                      as={Link} 
                      to="/admin/resume" 
                      variant={stats.profileImages > 0 ? "outline-warning" : "warning"} 
                      size="sm"
                      className="w-100"
                    >
                      <i className={`fas ${stats.profileImages > 0 ? 'fa-sync' : 'fa-camera'} me-2`}></i>
                      {stats.profileImages > 0 ? 'Change Image' : 'Upload Image'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* System Status */}
          <Row className="mt-4">
            <Col md={12}>
              <Card className="border-0 shadow-sm bg-light">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">
                        <i className="fas fa-server me-2 text-success"></i>
                        Database Status
                      </h6>
                      <p className="text-muted mb-0 small">
                        Connected to MySQL database with {stats.projects + stats.skills + stats.users + stats.resumes + stats.profileImages} total records across all tables
                      </p>
                    </div>
                    <Badge bg="success" className="fs-6">
                      <i className="fas fa-check-circle me-1"></i>
                      Online
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default DashboardHome