import React, { useState, useEffect } from 'react'
import { Modal, Button, ProgressBar, Alert } from 'react-bootstrap'
import { useAuth } from './AuthContext'

const SessionTimeoutWarning = () => {
  const { logout, getRemainingTime, getRemainingTimeFormatted, refreshToken } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120) // 2 minutes countdown
  const [isExtending, setIsExtending] = useState(false)

  useEffect(() => {
    const checkSession = () => {
      const remainingTime = getRemainingTime()
      
      // Show warning 2 minutes before expiry
      if (remainingTime > 0 && remainingTime <= 2 && !showWarning) {
        setShowWarning(true)
        setCountdown(120) // Reset countdown to 2 minutes
      }
    }

    const interval = setInterval(checkSession, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [getRemainingTime, showWarning])

  useEffect(() => {
    let countdownInterval
    if (showWarning) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            handleAutoLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [showWarning])

  const handleAutoLogout = () => {
    console.log('Auto-logout due to session expiry')
    logout()
    setShowWarning(false)
  }

  const handleExtendSession = async () => {
    setIsExtending(true)
    try {
      const success = await refreshToken()
      if (success) {
        setShowWarning(false)
        // Show success message
        setTimeout(() => {
          // You could show a toast notification here
          console.log('Session extended successfully')
        }, 100)
      } else {
        // If refresh fails, log out
        logout()
      }
    } catch (error) {
      console.error('Error extending session:', error)
      logout()
    } finally {
      setIsExtending(false)
    }
  }

  const handleLogout = () => {
    logout()
    setShowWarning(false)
  }

  const progressPercentage = (countdown / 120) * 100

  return (
    <Modal show={showWarning} backdrop="static" keyboard={false} centered>
      <Modal.Header className="bg-warning text-dark">
        <Modal.Title>
          <i className="fas fa-clock me-2"></i>
          Session Timeout Warning
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Your session is about to expire!
        </Alert>
        
        <p className="mb-3">
          For security reasons, your session will automatically expire in 
          <strong> {countdown} seconds</strong>.
        </p>
        
        <ProgressBar 
          now={progressPercentage} 
          variant="warning" 
          animated 
          className="mb-3"
          style={{ height: '8px' }}
        />
        
        <div className="text-center">
          <small className="text-muted">
            Session expires after 2 days of inactivity
          </small>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="outline-secondary" 
          onClick={handleLogout}
          disabled={isExtending}
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          Logout Now
        </Button>
        <Button 
          variant="warning" 
          onClick={handleExtendSession}
          disabled={isExtending}
        >
          {isExtending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Extending...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt me-2"></i>
              Extend Session
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default SessionTimeoutWarning