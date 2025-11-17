import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Table, Form, Modal, Alert, Badge } from 'react-bootstrap'
import axios from 'axios'

const ProjectsManagement = () => {
  const [projects, setProjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    technologies: [],
    project_url: '',
    github_url: '',
    featured: false
  })
  const [techInput, setTechInput] = useState('')
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/admin/projects')
      console.log('Fetched projects:', response.data)
      setProjects(response.data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      showAlert('Error fetching projects', 'danger')
    }
  }

  // Safe function to parse technologies
  const parseTechnologies = (techString) => {
    if (!techString) return []
    
    try {
      if (Array.isArray(techString)) return techString
      const parsed = JSON.parse(techString)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if (typeof techString === 'string') {
        return techString.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0)
      }
      return []
    }
  }

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000)
  }

  // Validation function
  const validateForm = () => {
    const errors = {}
    
    // Limit image_url to 255 characters (common VARCHAR limit)
    if (formData.image_url && formData.image_url.length > 255) {
      errors.image_url = 'Image URL must be less than 255 characters'
    }
    
    // Limit other URLs to 255 characters as well
    if (formData.project_url && formData.project_url.length > 255) {
      errors.project_url = 'Project URL must be less than 255 characters'
    }
    
    if (formData.github_url && formData.github_url.length > 255) {
      errors.github_url = 'GitHub URL must be less than 255 characters'
    }
    
    // Limit title and description
    if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters'
    }
    
    if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleShowModal = (project = null) => {
    if (project) {
      setEditingProject(project)
      setFormData({
        title: project.title || '',
        description: project.description || '',
        image_url: project.image_url || '',
        technologies: parseTechnologies(project.technologies),
        project_url: project.project_url || '',
        github_url: project.github_url || '',
        featured: project.featured || false
      })
    } else {
      setEditingProject(null)
      setFormData({
        title: '',
        description: '',
        image_url: '',
        technologies: [],
        project_url: '',
        github_url: '',
        featured: false
      })
    }
    setFormErrors({})
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setFormErrors({})
  }

  const handleAddTech = () => {
    if (techInput.trim() && !formData.technologies.includes(techInput.trim())) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, techInput.trim()]
      })
      setTechInput('')
    }
  }

  const handleRemoveTech = (techToRemove) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(tech => tech !== techToRemove)
    })
  }

  // Function to truncate URLs if they're too long
  const truncateUrl = (url, maxLength = 255) => {
    if (!url || url.length <= maxLength) return url
    return url.substring(0, maxLength)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      showAlert('Please fix the form errors before submitting', 'danger')
      return
    }
    
    setLoading(true)
    
    try {
      // Truncate URLs to prevent database errors
      const truncatedData = {
        ...formData,
        image_url: truncateUrl(formData.image_url),
        project_url: truncateUrl(formData.project_url),
        github_url: truncateUrl(formData.github_url),
        technologies: JSON.stringify(formData.technologies)
      }

      if (editingProject) {
        const projectId = editingProject.id || editingProject._id
        await axios.put(`/api/admin/projects/${projectId}`, truncatedData)
        showAlert('Project updated successfully', 'success')
      } else {
        await axios.post('/api/admin/projects', truncatedData)
        showAlert('Project created successfully', 'success')
      }
      handleCloseModal()
      fetchProjects()
    } catch (error) {
      console.error('Error saving project:', error)
      if (error.response?.data?.message) {
        showAlert(`Error: ${error.response.data.message}`, 'danger')
      } else {
        showAlert('Error saving project. Please check your input lengths.', 'danger')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (project) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const projectId = project.id || project._id
        await axios.delete(`/api/admin/projects/${projectId}`)
        showAlert('Project deleted successfully', 'success')
        fetchProjects()
      } catch (error) {
        console.error('Error deleting project:', error)
        showAlert('Error deleting project', 'danger')
      }
    }
  }

  // Safe function to get project ID
  const getProjectId = (project) => {
    return project.id || project._id || Math.random().toString(36).substr(2, 9)
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold text-dark">Projects Management</h2>
          <p className="text-muted">Manage your portfolio projects</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => handleShowModal()} className="fw-medium">
            <i className="fas fa-plus-circle me-2"></i>
            Add New Project
          </Button>
        </Col>
      </Row>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {projects && projects.length > 0 ? (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Project</th>
                  <th>Technologies</th>
                  <th>Status</th>
                  <th>Links</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const technologies = parseTechnologies(project.technologies)
                  const projectId = getProjectId(project)
                  
                  return (
                    <tr key={projectId}>
                      <td>
                        <div>
                          <strong className="text-dark">{project.title || 'Untitled Project'}</strong>
                          <p className="text-muted small mb-0">
                            {project.description ? `${project.description.substring(0, 80)}...` : 'No description'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div>
                          {technologies.map((tech, index) => (
                            <Badge key={index} bg="secondary" className="me-1 mb-1">
                              {tech}
                            </Badge>
                          ))}
                          {technologies.length === 0 && (
                            <span className="text-muted small">No technologies</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {project.featured ? (
                          <Badge bg="warning" text="dark">
                            <i className="fas fa-star me-1"></i>
                            Featured
                          </Badge>
                        ) : (
                          <Badge bg="secondary">Standard</Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {project.project_url && (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              href={project.project_url} 
                              target="_blank"
                              title="Live Demo"
                            >
                              <i className="fas fa-external-link-alt me-1"></i>
                              Demo
                            </Button>
                          )}
                          {project.github_url && (
                            <Button 
                              variant="outline-dark" 
                              size="sm" 
                              href={project.github_url} 
                              target="_blank"
                              title="GitHub"
                            >
                              <i className="fab fa-github me-1"></i>
                              GitHub
                            </Button>
                          )}
                          {!project.project_url && !project.github_url && (
                            <span className="text-muted small">No links</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleShowModal(project)}
                            title="Edit"
                          >
                            <i className="fas fa-edit me-1"></i>
                            Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(project)}
                            title="Delete"
                          >
                            <i className="fas fa-trash me-1"></i>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-project-diagram fa-3x mb-3"></i>
              <h5>No Projects Yet</h5>
              <p className="mb-3">Start by adding your first project to showcase your work</p>
              <Button variant="primary" onClick={() => handleShowModal()}>
                <i className="fas fa-plus-circle me-2"></i>
                Add Your First Project
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Project Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            <i className="fas fa-project-diagram me-2 text-primary"></i>
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Project Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="Enter project title"
                    className={`border-0 bg-light py-2 ${formErrors.title ? 'is-invalid' : ''}`}
                    maxLength={100}
                  />
                  <Form.Text className="text-muted">
                    {formData.title.length}/100 characters
                  </Form.Text>
                  {formErrors.title && (
                    <Form.Control.Feedback type="invalid">
                      {formErrors.title}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Image URL</Form.Label>
                  <Form.Control
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    placeholder="https://example.com/project-image.jpg"
                    className={`border-0 bg-light py-2 ${formErrors.image_url ? 'is-invalid' : ''}`}
                    maxLength={255}
                  />
                  <Form.Text className="text-muted">
                    {formData.image_url.length}/255 characters - Leave empty for default placeholder image
                  </Form.Text>
                  {formErrors.image_url && (
                    <Form.Control.Feedback type="invalid">
                      {formErrors.image_url}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                placeholder="Describe your project..."
                className={`border-0 bg-light py-2 ${formErrors.description ? 'is-invalid' : ''}`}
                maxLength={500}
              />
              <Form.Text className="text-muted">
                {formData.description.length}/500 characters
              </Form.Text>
              {formErrors.description && (
                <Form.Control.Feedback type="invalid">
                  {formErrors.description}
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Technologies</Form.Label>
              <div className="d-flex mb-2">
                <Form.Control
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Add technology (e.g., React, Node.js)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTech()
                    }
                  }}
                  className="border-0 bg-light py-2"
                />
                <Button 
                  variant="outline-secondary" 
                  onClick={handleAddTech} 
                  className="ms-2 border-0"
                  type="button"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>
              <div>
                {formData.technologies.map((tech, index) => (
                  <Badge key={index} bg="primary" className="me-1 mb-1 fs-6">
                    {tech}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-1"
                      style={{ fontSize: '0.6rem' }}
                      onClick={() => handleRemoveTech(tech)}
                    ></button>
                  </Badge>
                ))}
              </div>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Project URL</Form.Label>
                  <Form.Control
                    type="url"
                    value={formData.project_url}
                    onChange={(e) => setFormData({...formData, project_url: e.target.value})}
                    placeholder="https://your-project.com"
                    className={`border-0 bg-light py-2 ${formErrors.project_url ? 'is-invalid' : ''}`}
                    maxLength={255}
                  />
                  <Form.Text className="text-muted">
                    {formData.project_url.length}/255 characters
                  </Form.Text>
                  {formErrors.project_url && (
                    <Form.Control.Feedback type="invalid">
                      {formErrors.project_url}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">GitHub URL</Form.Label>
                  <Form.Control
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({...formData, github_url: e.target.value})}
                    placeholder="https://github.com/username/repo"
                    className={`border-0 bg-light py-2 ${formErrors.github_url ? 'is-invalid' : ''}`}
                    maxLength={255}
                  />
                  <Form.Text className="text-muted">
                    {formData.github_url.length}/255 characters
                  </Form.Text>
                  {formErrors.github_url && (
                    <Form.Control.Feedback type="invalid">
                      {formErrors.github_url}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Check
              type="checkbox"
              label={
                <span className="fw-medium">
                  <i className="fas fa-star me-2 text-warning"></i>
                  Feature this project
                </span>
              }
              checked={formData.featured}
              onChange={(e) => setFormData({...formData, featured: e.target.checked})}
              className="mt-3"
            />
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="outline-secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  {editingProject ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className={`fas ${editingProject ? 'fa-save' : 'fa-plus-circle'} me-2`}></i>
                  {editingProject ? 'Update Project' : 'Create Project'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default ProjectsManagement