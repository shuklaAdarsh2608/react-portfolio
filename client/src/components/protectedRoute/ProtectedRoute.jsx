import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Container, Spinner, Alert, Button, Card } from 'react-bootstrap'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAuthenticated, getRemainingTime, getRemainingTimeFormatted } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Checking authentication...</p>
        </div>
      </Container>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Check role-based access if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card className="shadow-lg border-0" style={{ maxWidth: '400px' }}>
          <Card.Body className="text-center p-4">
            <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
              style={{ width: '80px', height: '80px' }}>
              <i className="fas fa-ban text-danger fa-2x"></i>
            </div>
            <h4 className="text-danger fw-bold mb-3">Access Denied</h4>
            <p className="text-muted mb-4">
              You don't have permission to access this page. 
              {requiredRole && <span> Required role: <strong>{requiredRole}</strong></span>}
            </p>
            <Button variant="primary" onClick={() => window.history.back()}>
              <i className="fas fa-arrow-left me-2"></i>
              Go Back
            </Button>
          </Card.Body>
        </Card>
      </Container>
    )
  }

  // Show session expiry warning if less than 30 minutes remaining
  const remainingTime = getRemainingTime()
  if (remainingTime > 0 && remainingTime <= 30) {
    return (
      <>
        <Alert variant="warning" className="mb-0 text-center">
          <i className="fas fa-clock me-2"></i>
          Your session will expire in {getRemainingTimeFormatted()}. 
          <Button 
            variant="outline-warning" 
            size="sm" 
            className="ms-2"
            onClick={() => window.location.reload()} // Simple refresh to extend session
          >
            <i className="fas fa-sync-alt me-1"></i>
            Refresh Session
          </Button>
        </Alert>
        {children}
      </>
    )
  }

  return children
}

export default ProtectedRoute