import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Table, Form, Modal, Alert } from 'react-bootstrap'
import axios from 'axios'

const SkillsManagement = () => {
  const [skills, setSkills] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    proficiency: 50,
    icon: ''
  })
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    try {
      const response = await axios.get('/api/admin/skills')
      setSkills(response.data)
    } catch (error) {
      showAlert('Error fetching skills', 'danger')
    }
  }

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000)
  }

  const handleShowModal = (skill = null) => {
    if (skill) {
      setEditingSkill(skill)
      setFormData({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
        icon: skill.icon || ''
      })
    } else {
      setEditingSkill(null)
      setFormData({
        name: '',
        category: '',
        proficiency: 50,
        icon: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSkill(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSkill) {
        await axios.put(`/api/admin/skills/${editingSkill.id}`, formData)
        showAlert('Skill updated successfully', 'success')
      } else {
        await axios.post('/api/admin/skills', formData)
        showAlert('Skill created successfully', 'success')
      }
      handleCloseModal()
      fetchSkills()
    } catch (error) {
      showAlert('Error saving skill', 'danger')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this skill?')) {
      try {
        await axios.delete(`/api/admin/skills/${id}`)
        showAlert('Skill deleted successfully', 'success')
        fetchSkills()
      } catch (error) {
        showAlert('Error deleting skill', 'danger')
      }
    }
  }

  const categories = ['Frontend', 'Backend', 'Database', 'Tools', 'Languages', 'Other']

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2>Skills Management</h2>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => handleShowModal()}>
            Add New Skill
          </Button>
        </Col>
      </Row>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Proficiency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(skill => (
                <tr key={skill.id}>
                  <td>{skill.name}</td>
                  <td>
                    <span className="badge bg-info">{skill.category}</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="skill-bar me-2" style={{ width: '100px' }}>
                        <div 
                          className="skill-progress" 
                          style={{ width: `${skill.proficiency}%` }}
                        ></div>
                      </div>
                      <span>{skill.proficiency}%</span>
                    </div>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleShowModal(skill)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(skill.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {skills.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted">
                    No skills found. Add your first skill!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Skill Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Skill Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="e.g., React, Node.js, MySQL"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Proficiency: {formData.proficiency}%</Form.Label>
              <Form.Range
                min="0"
                max="100"
                step="5"
                value={formData.proficiency}
                onChange={(e) => setFormData({...formData, proficiency: parseInt(e.target.value)})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Icon (optional)</Form.Label>
              <Form.Control
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({...formData, icon: e.target.value})}
                placeholder="e.g., fab fa-react"
              />
              <Form.Text className="text-muted">
                Use Font Awesome class names (e.g., fab fa-react, fab fa-js-square)
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingSkill ? 'Update Skill' : 'Create Skill'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default SkillsManagement
