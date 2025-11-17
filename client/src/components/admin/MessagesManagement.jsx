import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Badge, Button, Alert, Modal, Form } from 'react-bootstrap'
import axios from 'axios'
import emailjs from '@emailjs/browser'

const MessagesManagement = () => {
  const [messages, setMessages] = useState([])
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [emailJSReady, setEmailJSReady] = useState(false)

  // EmailJS configuration
  const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_sh8kpgn',
    TEMPLATE_ID: 'template_yxd86s8',
    PUBLIC_KEY: 'vn5i908n9xEhG1hJZ'
  }

  useEffect(() => {
    fetchMessages()
    initializeEmailJS()
  }, [])

  const initializeEmailJS = async () => {
    try {
      if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS SDK not loaded.')
      }

      await emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY)
      setEmailJSReady(true)
      console.log('✅ EmailJS initialized successfully')
      
    } catch (error) {
      console.error('❌ EmailJS initialization failed:', error)
      setEmailJSReady(false)
      showAlert('Email service initialization failed', 'danger')
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await axios.get('/api/admin/messages')
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      showAlert('Error fetching messages', 'danger')
    }
  }

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000)
  }

  const sendEmail = async (message, type, replyContent = '') => {
    if (!emailJSReady) return false

    try {
      // Template parameters for YOUR template
      const templateParams = {
        // Recipient info
        email: message.email,
        to_name: message.name,
        
        // For replies: Replace original_message with just the reply
        original_message: type === 'reply' ? replyContent : message.message,
        
        // Date
        read_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        
        // Sender info
        from_name: 'Adarsh Shukla'
      }

      // Set subject based on type
      if (type === 'reply') {
        templateParams.subject = `Re: Your message to Adarsh Shukla`
      } else {
        templateParams.subject = `Message Read Confirmation`
      }

      console.log(`📧 Sending ${type} email to:`, message.email)

      const result = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      )

      console.log(`✅ ${type} email sent successfully`)
      return result.status === 200

    } catch (error) {
      console.error(`❌ Error sending ${type} email:`, error)
      if (error.text) {
        console.error('Error details:', error.text)
      }
      return false
    }
  }

  const markAsRead = async (id) => {
    try {
      const message = messages.find(msg => msg.id === id)
      if (!message) {
        showAlert('Message not found', 'danger')
        return
      }

      let emailSent = false
      if (emailJSReady) {
        emailSent = await sendEmail(message, 'read')
      }
      
      try {
        await axios.put(`/api/admin/messages/${id}/read`)
      } catch (error) {
        console.log('Backend update skipped (endpoint not available)')
      }
      
      setMessages(messages.map(msg => 
        msg.id === id ? { 
          ...msg, 
          read_status: true, 
          read_notification_sent: emailSent 
        } : msg
      ))

      if (emailSent) {
        showAlert('Message marked as read and notification sent!', 'success')
      } else {
        showAlert('Message marked as read', 'success')
      }
    } catch (error) {
      console.error('Error in markAsRead:', error)
      showAlert('Error updating message status', 'danger')
    }
  }

  const openReplyModal = (message) => {
    setSelectedMessage(message)
    setReplyContent('')
    setShowReplyModal(true)
  }

  const closeReplyModal = () => {
    setShowReplyModal(false)
    setSelectedMessage(null)
    setReplyContent('')
    setIsSending(false)
  }

  const sendReply = async () => {
    if (!replyContent.trim()) {
      showAlert('Please enter a reply message', 'warning')
      return
    }

    if (!emailJSReady || !selectedMessage) {
      showAlert('Email service is not available', 'danger')
      return
    }

    setIsSending(true)

    try {
      const emailSent = await sendEmail(selectedMessage, 'reply', replyContent)

      if (emailSent) {
        // Update backend status if endpoint exists
        try {
          await axios.put(`/api/admin/messages/${selectedMessage.id}/reply`)
        } catch (error) {
          console.log('Backend status update skipped')
        }
        
        // Update local state
        setMessages(messages.map(msg => 
          msg.id === selectedMessage.id ? { 
            ...msg, 
            read_status: true, 
            replied: true,
            reply_notification_sent: true,
            replied_at: new Date().toISOString(),
            reply_content: replyContent
          } : msg
        ))
        
        showAlert('Reply sent successfully!', 'success')
        closeReplyModal()
      } else {
        throw new Error('Failed to send email')
      }

    } catch (error) {
      console.error('❌ Failed to send reply:', error)
      showAlert('Failed to send reply. Please try again.', 'danger')
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Contact Messages</h2>
              <p className="text-muted">Manage and reply to contact form messages</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Badge bg="success" className="me-2">
                ✅ Reply Only Mode
              </Badge>
              <Badge bg={emailJSReady ? 'success' : 'warning'}>
                {emailJSReady ? '✅ Email Service Ready' : '🔄 Initializing...'}
              </Badge>
            </div>
          </div>
        </Col>
      </Row>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(message => (
                <tr key={message.id}>
                  <td>
                    <strong>{message.name}</strong>
                  </td>
                  <td>
                    <a href={`mailto:${message.email}`}>{message.email}</a>
                  </td>
                  <td>
                    <div 
                      className="text-truncate" 
                      style={{ maxWidth: '300px' }}
                      title={message.message}
                    >
                      {message.message}
                    </div>
                  </td>
                  <td>
                    <small className="text-muted">{formatDate(message.created_at)}</small>
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      {message.read_status ? (
                        <Badge bg="success">Read</Badge>
                      ) : (
                        <Badge bg="warning">Unread</Badge>
                      )}
                      {message.replied && (
                        <Badge bg="info">Replied</Badge>
                      )}
                      {message.read_notification_sent && (
                        <Badge bg="secondary">Notified</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {!message.read_status && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => markAsRead(message.id)}
                          disabled={!emailJSReady}
                        >
                          Mark as Read
                        </Button>
                      )}
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => openReplyModal(message)}
                        disabled={!emailJSReady}
                      >
                        Reply
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No messages found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Reply Modal */}
      <Modal show={showReplyModal} onHide={closeReplyModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reply to {selectedMessage?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMessage && (
            <>
              <Alert variant="success">
                <strong>✅ Reply Only Mode</strong> - Your reply will be sent without the original message.
              </Alert>

              <div className="mb-3">
                <strong>Original Message (for reference only):</strong>
                <div className="p-3 bg-light rounded mt-2">
                  {selectedMessage.message}
                </div>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>
                  <strong>Your Reply:</strong>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply message here. Only this content will be sent to the user."
                  disabled={!emailJSReady}
                />
                <Form.Text className="text-muted">
                  Only your reply text above will be sent in the email.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeReplyModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={sendReply}
            disabled={isSending || !replyContent.trim() || !emailJSReady}
          >
            {isSending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending...
              </>
            ) : (
              'Send Reply'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default MessagesManagement