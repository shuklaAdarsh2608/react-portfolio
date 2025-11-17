import React, { useState, useEffect, useRef } from 'react'
import { Container, Navbar, Nav, Row, Col, Card, Button, Form, Alert, Badge, ProgressBar } from 'react-bootstrap'
import axios from 'axios'

// Profile Image Component
const ProfileImage = ({ profileImage, size = 300, variant = 'hero' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [profileImage]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const shouldShowDefault = !profileImage || imageError;

  const getContainerClass = () => {
    return `profile-image-container ${variant === 'hero' ? 'hero-image' : 'about-image'}`;
  };

  const getImageClass = () => {
    return `profile-img ${variant === 'about' ? 'about-profile' : 'hero-profile'}`;
  };

  const getDefaultClass = () => {
    return `profile-default ${variant === 'about' ? 'about-default' : 'hero-default'}`;
  };

  return (
    <div className={getContainerClass()}>
      {/* Profile Image */}
      {profileImage && !imageError && (
        <img 
          src={`http://localhost:5000${profileImage.url}`}
          alt="Adarsh Shukla - Full Stack Developer"
          className={getImageClass()}
          style={{ 
            width: `${size}px`, 
            height: `${size}px`,
            display: imageLoaded ? 'block' : 'none'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Loading Spinner */}
      {profileImage && !imageLoaded && !imageError && (
        <div 
          className={getDefaultClass()}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Default Profile Circle */}
      {shouldShowDefault && (
        <div 
          className={getDefaultClass()}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <i className="fas fa-user text-white profile-icon"></i>
        </div>
      )}
    </div>
  );
};

// Contact Info Block Component - Responsive Grid Format
const ContactInfoBlock = () => {
  const contactInfo = [
    {
      icon: 'fas fa-user',
      label: 'Name',
      value: 'Adarsh Shukla'
    },
    {
      icon: 'fas fa-envelope',
      label: 'Email', 
      value: 'adarshshukla2608@gmail.com'
    },
    {
      icon: 'fas fa-phone',
      label: 'Phone',
      value: '+91-9792184584'
    },
    {
      icon: 'fas fa-map-marker-alt',
      label: 'Location',
      value: 'Pratapgarh, Uttar Pradesh'
    }
  ];

  return (
    <div className="contact-info-block">
      {/* Contact Info Grid - Responsive layout */}
      <div className="contact-info-grid">
        {contactInfo.map((item, index) => (
          <div key={index} className="contact-info-item">
            <div className="contact-info-icon">
              <i className={item.icon}></i>
            </div>
            <div className="contact-info-content">
              <span className="contact-info-label">{item.label}</span>
              <span className="contact-info-value">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Portfolio = () => {
  const [projects, setProjects] = useState([])
  const [skills, setSkills] = useState([])
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState({ 
    projects: true, 
    skills: true, 
    resume: true 
  })
  const [profileImage, setProfileImage] = useState(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [resumeInfo, setResumeInfo] = useState(null)
  const [resumeContent, setResumeContent] = useState(null)
  const [visibleSections, setVisibleSections] = useState(new Set())

  const sectionRefs = {
    home: useRef(null),
    about: useRef(null),
    resume: useRef(null),
    projects: useRef(null),
    skills: useRef(null),
    contact: useRef(null)
  }

  useEffect(() => {
    fetchProjects()
    fetchSkills()
    fetchProfileImage()
    checkResumeAvailability()
    fetchResumeContent()
    setupScrollAnimations()

    const resumeInterval = setInterval(() => {
      checkResumeAvailability()
      fetchResumeContent()
    }, 30000)

    return () => clearInterval(resumeInterval)
  }, [])

  const setupScrollAnimations = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => new Set(prev).add(entry.target.id))
        }
      })
    }, { threshold: 0.1 })

    Object.values(sectionRefs).forEach(ref => {
      if (ref.current) {
        ref.current.id = Object.keys(sectionRefs).find(key => sectionRefs[key] === ref);
        observer.observe(ref.current)
      }
    })

    return () => observer.disconnect()
  }

  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/projects')
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(prev => ({ ...prev, projects: false }))
    }
  }

  const fetchSkills = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/skills')
      setSkills(response.data)
    } catch (error) {
      console.error('Error fetching skills:', error)
    } finally {
      setLoading(prev => ({ ...prev, skills: false }))
    }
  }

  const fetchProfileImage = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/profile-image')
      setProfileImage(response.data)
    } catch (error) {
      setProfileImage(null)
    }
  }

  const checkResumeAvailability = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/resume/check')
      setResumeAvailable(response.data.available)
      setResumeInfo(response.data)
    } catch (error) {
      setResumeAvailable(false)
      setResumeInfo(null)
    }
  }

  const fetchResumeContent = async () => {
    try {
      setLoading(prev => ({ ...prev, resume: true }))
      const response = await axios.get('http://localhost:5000/api/resume/content')
      
      if (response.data && (response.data.education || response.data.experience || response.data.skills)) {
        const hasEducation = response.data.education && response.data.education.length > 0
        const hasExperience = response.data.experience && response.data.experience.length > 0
        const hasSkills = response.data.skills && response.data.skills.length > 0
        
        if (hasEducation || hasExperience || hasSkills) {
          setResumeContent(response.data)
        } else {
          setResumeContent(null)
        }
      } else {
        setResumeContent(null)
      }
    } catch (error) {
      setResumeContent(null)
    } finally {
      setLoading(prev => ({ ...prev, resume: false }))
    }
  }

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

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/contact', contactForm)
      setAlert({ show: true, message: 'Message sent successfully!', type: 'success' })
      setContactForm({ name: '', email: '', message: '' })
      setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000)
    } catch (error) {
      setAlert({ show: true, message: 'Failed to send message. Please try again.', type: 'danger' })
    }
  }

  const handleResumeDownload = async () => {
    try {
      await checkResumeAvailability();
      
      if (resumeAvailable && resumeInfo) {
        const link = document.createElement('a');
        link.href = `http://localhost:5000/api/resume?t=${Date.now()}`;
        link.download = resumeInfo.originalName || 'Professional_Resume.pdf';
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setAlert({ show: true, message: 'Resume download started!', type: 'success' });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
      } else {
        setAlert({ show: true, message: 'Resume is not available for download.', type: 'warning' });
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      setAlert({ show: true, message: 'Failed to download resume. Please try again.', type: 'danger' });
    }
  }

  const scrollToSection = (sectionId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  }

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {})

  const createPlaceholderSVG = (text = 'Project Image', width = 400, height = 250) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#667eea"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" dy=".3em">${text}</text>
      </svg>
    `)}`
  }

  const handleImageError = (e, projectTitle) => {
    e.target.src = createPlaceholderSVG(projectTitle || 'Project Image')
    e.target.onerror = null
  }

  const getImageUrl = (imageUrl, projectTitle) => {
    if (!imageUrl) {
      return createPlaceholderSVG(projectTitle || 'Project Image')
    }
    
    if (imageUrl.startsWith('http')) {
      return imageUrl
    }
    
    if (imageUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${imageUrl}`
    }
    
    return `http://localhost:5000/uploads/${imageUrl}`
  }

  const getAnimationClass = (sectionId) => {
    return visibleSections.has(sectionId) ? 'animate-in' : ''
  }

  const hasResumeContent = () => {
    if (!resumeContent) return false
    
    const hasEducation = resumeContent.education && resumeContent.education.length > 0
    const hasExperience = resumeContent.experience && resumeContent.experience.length > 0
    const hasSkills = resumeContent.skills && resumeContent.skills.length > 0
    
    return hasEducation || hasExperience || hasSkills
  }

  return (
    <>
      {/* Navigation with Admin Link */}
      <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="custom-navbar">
        <Container>
          <Navbar.Brand href="#home" className="brand-logo">
            <i className="fas fa-code me-2"></i>
            Adarsh Shukla
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link 
                href="#home" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('home', e)}
              >
                Home
              </Nav.Link>
              <Nav.Link 
                href="#about" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('about', e)}
              >
                About
              </Nav.Link>
              <Nav.Link 
                href="#resume" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('resume', e)}
              >
                Resume
              </Nav.Link>
              <Nav.Link 
                href="#projects" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('projects', e)}
              >
                Projects
              </Nav.Link>
              <Nav.Link 
                href="#skills" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('skills', e)}
              >
                Skills
              </Nav.Link>
              <Nav.Link 
                href="#contact" 
                className="nav-link-custom" 
                onClick={(e) => scrollToSection('contact', e)}
              >
                Contact
              </Nav.Link>
              {/* Admin Link */}
              <Nav.Link href="/admin/login" className="nav-link-custom admin-link">
                <i className="fas fa-lock me-1"></i>
                Admin
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section id="home" className="hero-section" ref={sectionRefs.home}>
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        <Container>
          <Row className="align-items-center hero-content-wrapper">
            <Col lg={6} className="hero-text-content">
              <div className="hero-content">
                <div className="hero-badge">Full Stack Developer</div>
                <h1 className="hero-title">
                  Hi, I'm <span className="text-primary">Adarsh Shukla</span>
                </h1>
                <p className="hero-subtitle">
                  I create beautiful, functional, and user-friendly web applications 
                  that solve real-world problems and deliver exceptional user experiences.
                </p>
                <div className="hero-buttons">
                  <Button 
                    className="btn-hero-primary"
                    onClick={(e) => scrollToSection('projects', e)}
                  >
                    <i className="fas fa-rocket me-2"></i>
                    View My Work
                  </Button>
                  <Button 
                    className="btn-hero-secondary"
                    onClick={(e) => scrollToSection('contact', e)}
                  >
                    <i className="fas fa-paper-plane me-2"></i>
                    Get In Touch
                  </Button>
                </div>
                <div className="hero-stats">
                  <div className="stat-item">
                    <span className="stat-number">10+</span>
                    <span className="stat-label">Projects</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">2+</span>
                    <span className="stat-label">Years</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">100%</span>
                    <span className="stat-label">Satisfaction</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6} className="hero-image-content">
              <ProfileImage profileImage={profileImage} size={310} variant="hero" />
            </Col>
          </Row>
        </Container>
      </section>

      {/* About Section */}
      <section 
        id="about" 
        ref={sectionRefs.about}
        className={`about-section ${getAnimationClass('about')}`}
      >
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="about-image-wrapper">
              <ProfileImage profileImage={profileImage} size={400} variant="about" />
            </Col>
            <Col lg={6} className="about-content-wrapper">
              <div className="section-header">
                <span className="section-subtitle">About Me</span>
                <h2 className="section-title">Adarsh Shukla</h2>
                <p className="about-intro">
                  Full Stack Developer passionate about creating amazing digital experiences
                </p>
                <div className="section-divider"></div>
              </div>
              <p className="about-description">
                I'm a passionate Full Stack Developer with expertise in modern web technologies. 
                I specialize in creating efficient, scalable, and user-friendly applications 
                that provide exceptional user experiences across all devices.
              </p>
              
              {/* Contact Info Block - Responsive Grid Format */}
              <ContactInfoBlock />
              
              <div className="about-highlights">
                <div className="highlight-item">
                  <i className="fas fa-check-circle"></i>
                  <span>Clean & Maintainable Code</span>
                </div>
                <div className="highlight-item">
                  <i className="fas fa-check-circle"></i>
                  <span>Responsive Design</span>
                </div>
                <div className="highlight-item">
                  <i className="fas fa-check-circle"></i>
                  <span>Performance Optimization</span>
                </div>
                <div className="highlight-item">
                  <i className="fas fa-check-circle"></i>
                  <span>User Experience Focus</span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Resume Section */}
      <section 
        id="resume" 
        ref={sectionRefs.resume}
        className={`resume-section ${getAnimationClass('resume')}`}
      >
        <Container>
          <div className="section-header text-center">
            <span className="section-subtitle">My Resume</span>
            <h2 className="section-title">Experience & Education</h2>
            <div className="section-divider center"></div>
          </div>

          {alert.show && (
            <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })} className="custom-alert">
              {alert.message}
            </Alert>
          )}

          <div className="resume-actions">
            {resumeAvailable ? (
              <Button className="resume-download-btn" onClick={handleResumeDownload}>
                <i className="fas fa-download me-2"></i>
                Download Resume
              </Button>
            ) : (
              <Button className="resume-download-btn disabled" disabled>
                <i className="fas fa-file-download me-2"></i>
                Resume Coming Soon
              </Button>
            )}
          </div>

          {loading.resume ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading resume content...</p>
            </div>
          ) : hasResumeContent() ? (
            <Row>
              {resumeContent.education && resumeContent.education.length > 0 && (
                <Col lg={6} className="mb-5">
                  <div className="resume-category">
                    <div className="category-header">
                      <i className="fas fa-graduation-cap category-icon"></i>
                      <h3 className="category-title">Education</h3>
                    </div>
                    <div className="timeline">
                      {resumeContent.education.map((edu, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <h4 className="timeline-title">{edu.degree}</h4>
                            <p className="timeline-institution">{edu.institution}</p>
                            <p className="timeline-location">{edu.location}</p>
                            <span className="timeline-period">{edu.period}</span>
                            {edu.description && (
                              <p className="timeline-description">{edu.description}</p>
                            )}
                            {edu.gpa && (
                              <div className="timeline-badge">
                                GPA: {edu.gpa}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              )}

              {resumeContent.experience && resumeContent.experience.length > 0 && (
                <Col lg={6} className="mb-5">
                  <div className="resume-category">
                    <div className="category-header">
                      <i className="fas fa-briefcase category-icon"></i>
                      <h3 className="category-title">Experience</h3>
                    </div>
                    <div className="timeline">
                      {resumeContent.experience.map((exp, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <h4 className="timeline-title">{exp.position}</h4>
                            <p className="timeline-company">{exp.company}</p>
                            <p className="timeline-location">{exp.location}</p>
                            <span className="timeline-period">{exp.period}</span>
                            <p className="timeline-description">{exp.description}</p>
                            {exp.achievements && exp.achievements.length > 0 && (
                              <ul className="timeline-achievements">
                                {exp.achievements.map((achievement, achIndex) => (
                                  <li key={achIndex}>{achievement}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          ) : (
            <div className="no-resume-content text-center">
              <i className="fas fa-file-pdf fa-3x"></i>
              <h4>No Resume Content Available</h4>
              <p>Upload a resume through the admin panel to see your content here.</p>
            </div>
          )}
        </Container>
      </section>

      {/* Projects Section */}
      <section 
        id="projects" 
        ref={sectionRefs.projects}
        className={`projects-section ${getAnimationClass('projects')}`}
      >
        <Container>
          <div className="section-header text-center">
            <span className="section-subtitle">My Work</span>
            <h2 className="section-title">Featured Projects</h2>
            <div className="section-divider center"></div>
            <p className="section-description">
              Here are some of my recent projects that showcase my skills and experience
            </p>
          </div>

          {loading.projects ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading projects...</p>
            </div>
          ) : (
            <Row>
              {projects.map(project => {
                const technologies = parseTechnologies(project.technologies)
                const imageUrl = getImageUrl(project.image_url, project.title)
                
                return (
                  <Col lg={4} md={6} key={project.id} className="mb-4">
                    <div className="project-card">
                      <div className="project-image">
                        <img 
                          src={imageUrl}
                          alt={project.title}
                          onError={(e) => handleImageError(e, project.title)}
                          loading="lazy"
                        />
                        <div className="project-overlay">
                          <div className="project-actions">
                            {project.project_url && (
                              <a 
                                href={project.project_url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="project-action-btn"
                              >
                                <i className="fas fa-external-link-alt"></i>
                              </a>
                            )}
                            {project.github_url && (
                              <a 
                                href={project.github_url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="project-action-btn"
                              >
                                <i className="fab fa-github"></i>
                              </a>
                            )}
                          </div>
                        </div>
                        {project.featured && (
                          <div className="project-badge">
                            <i className="fas fa-star"></i>
                            Featured
                          </div>
                        )}
                      </div>
                      <div className="project-content">
                        <h3 className="project-title">{project.title}</h3>
                        <p className="project-description">{project.description}</p>
                        <div className="project-technologies">
                          {technologies.map((tech, index) => (
                            <span key={index} className="technology-tag">{tech}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Col>
                )
              })}
              
              {projects.length === 0 && (
                <Col className="text-center">
                  <div className="no-projects">
                    <i className="fas fa-folder-open fa-3x"></i>
                    <h4>No Projects Yet</h4>
                    <p>Check back soon for amazing projects!</p>
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Container>
      </section>

      {/* Skills Section */}
      <section 
        id="skills" 
        ref={sectionRefs.skills}
        className={`skills-section ${getAnimationClass('skills')}`}
      >
        <Container>
          <div className="section-header text-center">
            <span className="section-subtitle">My Skills</span>
            <h2 className="section-title">Technical Expertise</h2>
            <div className="section-divider center"></div>
            <p className="section-description">
              Here are the technologies and tools I work with to bring ideas to life
            </p>
          </div>

          {loading.skills ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading skills...</p>
            </div>
          ) : (
            <Row>
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <Col lg={6} key={category} className="mb-4">
                  <div className="skills-category">
                    <div className="category-header">
                      <i className={`fas ${
                        category === 'Frontend' ? 'fa-palette' :
                        category === 'Backend' ? 'fa-server' :
                        category === 'Database' ? 'fa-database' : 'fa-tools'
                      } category-icon`}></i>
                      <h4 className="category-title">{category}</h4>
                    </div>
                    <div className="skills-list">
                      {categorySkills.map(skill => (
                        <div key={skill.id} className="skill-item">
                          <div className="skill-header">
                            <span className="skill-name">
                              {skill.icon && <i className={`${skill.icon} me-2`}></i>}
                              {skill.name}
                            </span>
                            <span className="skill-percentage">{skill.proficiency}%</span>
                          </div>
                          <div className="skill-progress">
                            <div 
                              className="skill-progress-bar" 
                              style={{ width: `${skill.proficiency}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      {/* Contact Section */}
      <section 
        id="contact" 
        ref={sectionRefs.contact}
        className={`contact-section ${getAnimationClass('contact')}`}
      >
        <Container>
          <div className="section-header text-center">
            <span className="section-subtitle">Get In Touch</span>
            <h2 className="section-title">Let's Work Together</h2>
            <div className="section-divider center"></div>
            <p className="section-description">
              Have a project in mind? Feel free to reach out and let's discuss how we can bring your ideas to life.
            </p>
          </div>

          <Row className="justify-content-center">
            <Col lg={8}>
              {alert.show && (
                <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })} className="contact-alert">
                  <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                  {alert.message}
                </Alert>
              )}
              
              <div className="contact-form-wrapper">
                <Form onSubmit={handleContactSubmit} className="contact-form">
                  <Row>
                    <Col md={6}>
                      <Form.Group className="form-group">
                        <Form.Label>Your Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          required
                          placeholder="Enter your name"
                          className="form-control"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="form-group">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          required
                          placeholder="Enter your email"
                          className="form-control"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="form-group">
                    <Form.Label>Your Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      required
                      placeholder="Tell me about your project or how I can help you..."
                      className="form-control"
                    />
                  </Form.Group>
                  <div className="form-submit">
                    <Button type="submit" className="submit-btn">
                      <i className="fas fa-paper-plane me-2"></i>
                      Send Message
                    </Button>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="custom-footer">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="footer-info">
              <h5>Adarsh Shukla</h5>
              <p>Full Stack Developer passionate about creating amazing digital experiences</p>
              <div className="contact-info">
                <p><i className="fas fa-envelope me-2"></i>adarshshukla2608@gmail.com</p>
                <p><i className="fas fa-phone me-2"></i>+91-9792184584</p>
                <p><i className="fas fa-map-marker-alt me-2"></i>Pratapgarh, Uttar Pradesh</p>
              </div>
            </Col>
            <Col md={6} className="footer-links">
              <div className="social-links">
                <a href="#" className="social-link">
                  <i className="fab fa-github"></i>
                </a>
                <a href="#" className="social-link">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" className="social-link">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="social-link">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
              <div className="footer-nav">
                <a href="#home" onClick={(e) => scrollToSection('home', e)}>Home</a>
                <a href="#about" onClick={(e) => scrollToSection('about', e)}>About</a>
                <a href="#resume" onClick={(e) => scrollToSection('resume', e)}>Resume</a>
                <a href="#projects" onClick={(e) => scrollToSection('projects', e)}>Projects</a>
                <a href="#skills" onClick={(e) => scrollToSection('skills', e)}>Skills</a>
                <a href="#contact" onClick={(e) => scrollToSection('contact', e)}>Contact</a>
              </div>
            </Col>
          </Row>
          <div className="footer-bottom">
            <p>&copy; 2025 Adarsh Shukla. All rights reserved.</p>
          </div>
        </Container>
      </footer>
    </>
  )
}

export default Portfolio