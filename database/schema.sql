-- Create database
CREATE DATABASE IF NOT EXISTS portfolio_db;
USE portfolio_db;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio projects table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    technologies JSON,
    project_url VARCHAR(500),
    github_url VARCHAR(500),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    proficiency INT DEFAULT 0,
    icon VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resume table for storing uploaded resumes
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile images table for storing uploaded profile pictures
CREATE TABLE IF NOT EXISTS profile_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resume education table
CREATE TABLE IF NOT EXISTS resume_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT,
    degree VARCHAR(255),
    institution VARCHAR(255),
    location VARCHAR(255),
    period VARCHAR(100),
    description TEXT,
    gpa VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- Resume experience table
CREATE TABLE IF NOT EXISTS resume_experience (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT,
    position VARCHAR(255),
    company VARCHAR(255),
    location VARCHAR(255),
    period VARCHAR(100),
    description TEXT,
    achievements JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- Resume skills table
CREATE TABLE IF NOT EXISTS resume_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT,
    category VARCHAR(100),
    skills JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO admin_users (username, email, password) VALUES 
('admin', 'admin@portfolio.com', '$2a$10$8K1p/a0dRTlB0Z6bZ8Bw.e8x9W5x5J5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z');

-- Insert sample projects
INSERT IGNORE INTO projects (title, description, image_url, technologies, project_url, github_url, featured) VALUES 
('E-Commerce Platform', 'A full-stack e-commerce application with user authentication, product management, and payment integration.', '/uploads/project-ecommerce.jpg', '["React", "Node.js", "MySQL", "Stripe", "Express"]', 'https://demo-ecommerce.com', 'https://github.com/user/ecommerce', TRUE),
('Task Management App', 'A collaborative task management application with real-time updates and team collaboration features.', '/uploads/project-taskapp.jpg', '["Vue.js", "Express", "MongoDB", "Socket.io", "JWT"]', 'https://demo-tasks.com', 'https://github.com/user/taskapp', TRUE),
('Weather Dashboard', 'A responsive weather application that displays current conditions and forecasts for multiple cities.', '/uploads/project-weather.jpg', '["JavaScript", "CSS3", "REST API", "Chart.js"]', 'https://demo-weather.com', 'https://github.com/user/weather', FALSE),
('Portfolio Website', 'A responsive portfolio website built with React and modern web technologies.', '/uploads/project-portfolio.jpg', '["React", "Bootstrap", "Node.js", "MySQL"]', 'https://myportfolio.com', 'https://github.com/user/portfolio', TRUE),
('Social Media App', 'A social media platform with posts, comments, and real-time messaging.', '/uploads/project-social.jpg', '["React Native", "Firebase", "Redux", "Node.js"]', 'https://demo-social.com', 'https://github.com/user/socialapp', FALSE);

-- Insert sample skills with proper categories
INSERT IGNORE INTO skills (name, category, proficiency, icon) VALUES 
-- Frontend Technologies
('React', 'Frontend', 90, 'fab fa-react'),
('Vue.js', 'Frontend', 85, 'fab fa-vuejs'),
('JavaScript', 'Frontend', 95, 'fab fa-js-square'),
('HTML5', 'Frontend', 95, 'fab fa-html5'),
('CSS3', 'Frontend', 90, 'fab fa-css3-alt'),
('Bootstrap', 'Frontend', 88, 'fab fa-bootstrap'),
('Tailwind CSS', 'Frontend', 80, 'fas fa-palette'),

-- Backend Technologies
('Node.js', 'Backend', 85, 'fab fa-node-js'),
('Express', 'Backend', 85, 'fas fa-server'),
('Python', 'Backend', 75, 'fab fa-python'),
('PHP', 'Backend', 70, 'fab fa-php'),
('REST API', 'Backend', 88, 'fas fa-code'),

-- Database Technologies
('MySQL', 'Database', 80, 'fas fa-database'),
('MongoDB', 'Database', 70, 'fas fa-database'),
('PostgreSQL', 'Database', 75, 'fas fa-database'),
('Firebase', 'Database', 65, 'fas fa-fire'),

-- Tools & Others
('Git', 'Tools', 88, 'fab fa-git-alt'),
('GitHub', 'Tools', 90, 'fab fa-github'),
('Docker', 'Tools', 60, 'fab fa-docker'),
('AWS', 'Tools', 65, 'fab fa-aws'),
('NPM', 'Tools', 85, 'fab fa-npm');

-- Insert sample contact messages
INSERT IGNORE INTO contact_messages (name, email, message, read_status) VALUES 
('John Smith', 'john.smith@email.com', 'Hello! I am impressed with your portfolio and would like to discuss a potential project collaboration. Your work on the e-commerce platform looks particularly interesting.', TRUE),
('Sarah Johnson', 'sarah.j@techcompany.com', 'We are looking for a full-stack developer for our startup. Your skills match our requirements perfectly. Would you be available for an interview next week?', FALSE),
('Mike Wilson', 'mike.wilson@designstudio.com', 'I really like your design approach in the portfolio website. Do you take on freelance design and development projects?', TRUE),
('Emily Davis', 'emily.davis@corporation.com', 'Your task management application caught our attention. We are interested in developing a similar solution for our company. Can we schedule a call to discuss this further?', FALSE);

-- Show all tables
SHOW TABLES;

-- Display table counts
SELECT 
    'admin_users' as table_name, COUNT(*) as count FROM admin_users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'skills', COUNT(*) FROM skills
UNION ALL
SELECT 'contact_messages', COUNT(*) FROM contact_messages
UNION ALL
SELECT 'resumes', COUNT(*) FROM resumes
UNION ALL
SELECT 'profile_images', COUNT(*) FROM profile_images
UNION ALL
SELECT 'resume_education', COUNT(*) FROM resume_education
UNION ALL
SELECT 'resume_experience', COUNT(*) FROM resume_experience
UNION ALL
SELECT 'resume_skills', COUNT(*) FROM resume_skills;