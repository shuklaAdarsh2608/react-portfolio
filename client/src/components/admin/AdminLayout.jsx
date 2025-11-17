import React from 'react'
import { Container, Navbar, Nav, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { path: '/admin/projects', label: 'Projects', icon: 'fas fa-project-diagram' },
    { path: '/admin/skills', label: 'Skills', icon: 'fas fa-cogs' },
    { path: '/admin/messages', label: 'Messages', icon: 'fas fa-envelope' },
  ]

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div className="bg-dark text-white p-3" style={{ width: '250px', minHeight: '100vh' }}>
        <h4 className="text-center mb-4">Admin Panel</h4>
        <Nav className="flex-column">
          {menuItems.map((item) => (
            <Nav.Link 
              key={item.path}
              as={Link}
              to={item.path}
              className={`text-white mb-2 ${location.pathname === item.path ? 'bg-primary rounded' : ''}`}
            >
              <i className={`${item.icon} me-2`}></i>
              {item.label}
            </Nav.Link>
          ))}
        </Nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        <Navbar bg="light" expand="lg">
          <Container fluid>
            <Navbar.Brand>Admin Dashboard</Navbar.Brand>
            <Navbar.Collapse className="justify-content-end">
              <Navbar.Text className="me-3">
                Signed in as: <strong>{user?.username}</strong>
              </Navbar.Text>
              <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container fluid className="p-4">
          {children}
        </Container>
      </div>
    </div>
  )
}

export default AdminLayout