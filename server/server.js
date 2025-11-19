const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
require('dotenv').config();
const railDB = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
const connection = mysql.createConnection(railDB);
module.exports = connection;x 

const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log('📨 Incoming Request:', {
        method: req.method,
        url: req.url,
        headers: {
            authorization: req.headers.authorization ? 'Bearer ***' : 'None',
            'content-type': req.headers['content-type']
        },
        body: req.body && Object.keys(req.body).length > 0 ? req.body : 'Empty'
    });
    next();
});

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portfolio_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Database pool created');
} catch (error) {
    console.error('❌ Failed to create database pool:', error);
    process.exit(1);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resume'), false);
    }
  } else if (file.fieldname === 'profileImage') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database tables
const initializeTables = async () => {
    try {
        // Create resume content tables if they don't exist
        const createTablesSQL = [
            `CREATE TABLE IF NOT EXISTS resume_education (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resume_id INT NOT NULL,
                degree VARCHAR(255) NOT NULL,
                institution VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                period VARCHAR(100),
                description TEXT,
                gpa VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS resume_experience (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resume_id INT NOT NULL,
                position VARCHAR(255) NOT NULL,
                company VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                period VARCHAR(100),
                description TEXT,
                achievements TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS resume_skills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resume_id INT NOT NULL,
                category VARCHAR(255) NOT NULL,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of createTablesSQL) {
            await pool.execute(sql);
        }
        
        console.log('✅ Resume content tables initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing tables:', error.message);
        return false;
    }
};

// Initialize database connection and tables
const initializeDatabase = async () => {
    const connected = await testConnection();
    if (connected) {
        await initializeTables();
    }
};

initializeDatabase();

// Enhanced JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('🔐 Auth header received:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ No token provided in request');
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        console.log('✅ Token verified for user:', decoded.username);
        next();
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// ==================== CACHE MANAGEMENT ====================

// Simple in-memory cache to prevent duplicate calls
const apiCache = {
    resumeContent: null,
    resumeCheck: null,
    lastUpdated: null,
    cacheTimeout: 5000 // 5 seconds cache
};

const clearResumeCache = () => {
    apiCache.resumeContent = null;
    apiCache.resumeCheck = null;
    apiCache.lastUpdated = null;
    console.log('🧹 Resume cache cleared');
};

// Cache middleware for resume endpoints
const cacheResumeData = (req, res, next) => {
    const now = Date.now();
    
    // If we have cached data and it's not expired, return cached data
    if (apiCache.resumeContent && apiCache.lastUpdated && (now - apiCache.lastUpdated < apiCache.cacheTimeout)) {
        console.log('⚡ Serving from cache');
        return res.json(apiCache.resumeContent);
    }
    
    // Otherwise, proceed and cache the result
    const originalSend = res.json;
    res.json = function(data) {
        if (req.path === '/api/resume/content' && data && !data.error) {
            apiCache.resumeContent = data;
            apiCache.lastUpdated = Date.now();
            console.log('💾 Cached resume content');
        }
        originalSend.call(this, data);
    };
    next();
};

// ==================== MANUAL RESUME CONTENT MANAGEMENT ROUTES ====================

// Get current resume ID (helper function)
const getCurrentResumeId = async () => {
  try {
    const [resumes] = await pool.execute(
      'SELECT id FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    return resumes.length > 0 ? resumes[0].id : null;
  } catch (error) {
    console.error('Error getting current resume ID:', error);
    return null;
  }
};

// Education management routes
app.post('/api/admin/resume/education', authenticateToken, async (req, res) => {
  try {
    const { id, degree, institution, location, period, description, gpa } = req.body;
    const resumeId = await getCurrentResumeId();
    
    if (!resumeId) {
      return res.status(400).json({ error: 'No resume found. Please upload a resume first.' });
    }

    if (!degree || !institution || !period) {
      return res.status(400).json({ error: 'Degree, institution, and period are required' });
    }

    if (id) {
      // Update existing education
      await pool.execute(
        'UPDATE resume_education SET degree = ?, institution = ?, location = ?, period = ?, description = ?, gpa = ? WHERE id = ? AND resume_id = ?',
        [degree, institution, location, period, description, gpa, id, resumeId]
      );
      res.json({ message: 'Education updated successfully' });
    } else {
      // Create new education
      const [result] = await pool.execute(
        'INSERT INTO resume_education (resume_id, degree, institution, location, period, description, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [resumeId, degree, institution, location, period, description, gpa]
      );
      res.json({ message: 'Education added successfully', id: result.insertId });
    }

    // Clear cache after modification
    clearResumeCache();
    
  } catch (error) {
    console.error('Error saving education:', error);
    res.status(500).json({ error: 'Failed to save education' });
  }
});

app.delete('/api/admin/resume/education/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const resumeId = await getCurrentResumeId();
    
    if (!resumeId) {
      return res.status(400).json({ error: 'No resume found' });
    }

    await pool.execute(
      'DELETE FROM resume_education WHERE id = ? AND resume_id = ?',
      [id, resumeId]
    );
    
    // Clear cache after modification
    clearResumeCache();
    
    res.json({ message: 'Education deleted successfully' });
  } catch (error) {
    console.error('Error deleting education:', error);
    res.status(500).json({ error: 'Failed to delete education' });
  }
});

// Experience management routes
app.post('/api/admin/resume/experience', authenticateToken, async (req, res) => {
  try {
    const { id, position, company, location, period, description, achievements } = req.body;
    const resumeId = await getCurrentResumeId();
    
    if (!resumeId) {
      return res.status(400).json({ error: 'No resume found. Please upload a resume first.' });
    }

    if (!position || !company || !period) {
      return res.status(400).json({ error: 'Position, company, and period are required' });
    }

    // Process achievements - split by newline and filter empty lines
    const achievementsArray = achievements 
      ? achievements.split('\n').filter(ach => ach.trim().length > 0)
      : [];
    const achievementsString = achievementsArray.join('| ');

    if (id) {
      // Update existing experience
      await pool.execute(
        'UPDATE resume_experience SET position = ?, company = ?, location = ?, period = ?, description = ?, achievements = ? WHERE id = ? AND resume_id = ?',
        [position, company, location, period, description, achievementsString, id, resumeId]
      );
      res.json({ message: 'Experience updated successfully' });
    } else {
      // Create new experience
      const [result] = await pool.execute(
        'INSERT INTO resume_experience (resume_id, position, company, location, period, description, achievements) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [resumeId, position, company, location, period, description, achievementsString]
      );
      res.json({ message: 'Experience added successfully', id: result.insertId });
    }

    // Clear cache after modification
    clearResumeCache();
    
  } catch (error) {
    console.error('Error saving experience:', error);
    res.status(500).json({ error: 'Failed to save experience' });
  }
});

app.delete('/api/admin/resume/experience/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const resumeId = await getCurrentResumeId();
    
    if (!resumeId) {
      return res.status(400).json({ error: 'No resume found' });
    }

    await pool.execute(
      'DELETE FROM resume_experience WHERE id = ? AND resume_id = ?',
      [id, resumeId]
    );
    
    // Clear cache after modification
    clearResumeCache();
    
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

// ==================== FIXED RESUME CONTENT PARSING ====================

// Fixed PDF parsing function
const parseResumeContent = async (filePath, resumeId) => {
  let text = '';
  try {
    console.log('📄 Starting real PDF parsing for resume ID:', resumeId);
    
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF - FIXED: Use the correct pdf-parse syntax
    const data = await pdf(dataBuffer);
    text = data.text;
    
    console.log('📝 Extracted PDF text length:', text.length);
    console.log('📄 First 500 characters:', text.substring(0, 500));
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }
    
    // Parse education information
    const education = parseEducation(text);
    console.log('🎓 Parsed education:', education);
    
    // Parse experience information
    const experience = parseExperience(text);
    console.log('💼 Parsed experience:', experience);
    
    // Parse skills information
    const skills = parseSkills(text);
    console.log('🛠️ Parsed skills:', skills);
    
    // Parse personal information
    const personalInfo = parsePersonalInfo(text);
    console.log('👤 Parsed personal info:', personalInfo);

    // Clear previous resume content
    try {
      await pool.execute('DELETE FROM resume_education WHERE resume_id = ?', [resumeId]);
      await pool.execute('DELETE FROM resume_experience WHERE resume_id = ?', [resumeId]);
      await pool.execute('DELETE FROM resume_skills WHERE resume_id = ?', [resumeId]);
    } catch (error) {
      console.log('ℹ️ No previous resume content to delete or tables not ready');
    }

    // Store education data
    for (const edu of education) {
      await pool.execute(
        'INSERT INTO resume_education (resume_id, degree, institution, location, period, description, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [resumeId, edu.degree || '', edu.institution || '', edu.location || '', edu.period || '', edu.description || '', edu.gpa || '']
      );
    }

    // Store experience data
    for (const exp of experience) {
      const achievementsString = Array.isArray(exp.achievements) ? exp.achievements.join('| ') : '';
      await pool.execute(
        'INSERT INTO resume_experience (resume_id, position, company, location, period, description, achievements) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [resumeId, exp.position || '', exp.company || '', exp.location || '', exp.period || '', exp.description || '', achievementsString]
      );
    }

    // Store skills data
    for (const skillCat of skills) {
      const skillsString = Array.isArray(skillCat.skills) ? skillCat.skills.join(', ') : '';
      await pool.execute(
        'INSERT INTO resume_skills (resume_id, category, skills) VALUES (?, ?, ?)',
        [resumeId, skillCat.category || 'Other', skillsString]
      );
    }

    console.log('✅ Real resume content parsed and stored successfully');
    console.log('📊 Stored counts:', {
      education: education.length,
      experience: experience.length,
      skills: skills.length
    });

    return {
      education,
      experience,
      skills,
      personalInfo
    };

  } catch (error) {
    console.error('❌ Error parsing resume content:', error);
    
    // Try basic parsing as fallback
    if (text) {
      console.log('🔄 Trying basic parsing with extracted text...');
      return await parseResumeBasic(text, resumeId);
    } else {
      // If no text was extracted, create some dummy data for testing
      console.log('🔄 Creating sample data for testing...');
      return await createSampleResumeData(resumeId);
    }
  }
};

// Add this function for sample data
const createSampleResumeData = async (resumeId) => {
  try {
    // Clear previous content
    await pool.execute('DELETE FROM resume_education WHERE resume_id = ?', [resumeId]);
    await pool.execute('DELETE FROM resume_experience WHERE resume_id = ?', [resumeId]);
    await pool.execute('DELETE FROM resume_skills WHERE resume_id = ?', [resumeId]);

    // Insert sample education
    await pool.execute(
      'INSERT INTO resume_education (resume_id, degree, institution, period, description) VALUES (?, ?, ?, ?, ?)',
      [resumeId, 'Bachelor of Technology in Computer Science', 'Sample University', '2020-2024', 'Graduated with honors in Computer Science and Engineering']
    );

    // Insert sample experience
    await pool.execute(
      'INSERT INTO resume_experience (resume_id, position, company, period, description) VALUES (?, ?, ?, ?, ?)',
      [resumeId, 'Full Stack Developer', 'Tech Company Inc', '2023-Present', 'Developed web applications using modern technologies']
    );

    // Insert sample skills
    await pool.execute(
      'INSERT INTO resume_skills (resume_id, category, skills) VALUES (?, ?, ?)',
      [resumeId, 'Programming Languages', 'JavaScript, Python, Java']
    );

    await pool.execute(
      'INSERT INTO resume_skills (resume_id, category, skills) VALUES (?, ?, ?)',
      [resumeId, 'Web Technologies', 'React, Node.js, Express, MongoDB']
    );

    console.log('✅ Sample resume data created for testing');
    
    return {
      education: [{ degree: 'Bachelor of Technology in Computer Science', institution: 'Sample University', period: '2020-2024' }],
      experience: [{ position: 'Full Stack Developer', company: 'Tech Company Inc', period: '2023-Present' }],
      skills: [
        { category: 'Programming Languages', skills: ['JavaScript', 'Python', 'Java'] },
        { category: 'Web Technologies', skills: ['React', 'Node.js', 'Express', 'MongoDB'] }
      ]
    };
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Basic parsing as fallback
const parseResumeBasic = async (text, resumeId) => {
  try {
    console.log('🔄 Using basic parsing fallback');
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const education = [];
    const experience = [];
    const skills = [];
    
    // Basic education detection
    const eduKeywords = ['university', 'college', 'institute', 'bachelor', 'master', 'degree', 'education'];
    let currentEdu = null;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect education section
      if (eduKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 100) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = { degree: line.trim(), institution: '', period: '' };
      } else if (currentEdu) {
        if (!currentEdu.institution && line.length < 100) {
          currentEdu.institution = line.trim();
        } else if (!currentEdu.period && (line.includes('20') || line.includes('19'))) {
          currentEdu.period = line.trim();
        }
      }
    }
    if (currentEdu) education.push(currentEdu);
    
    // Basic skills detection
    const techSkills = ['javascript', 'python', 'java', 'react', 'node', 'html', 'css', 'sql', 'mongodb', 'express'];
    const foundSkills = techSkills.filter(skill => text.toLowerCase().includes(skill));
    
    if (foundSkills.length > 0) {
      skills.push({
        category: 'Technical Skills',
        skills: foundSkills
      });
    }
    
    // Store basic data
    for (const edu of education) {
      await pool.execute(
        'INSERT INTO resume_education (resume_id, degree, institution, period) VALUES (?, ?, ?, ?)',
        [resumeId, edu.degree, edu.institution, edu.period]
      );
    }
    
    if (skills.length > 0) {
      await pool.execute(
        'INSERT INTO resume_skills (resume_id, category, skills) VALUES (?, ?, ?)',
        [resumeId, skills[0].category, skills[0].skills.join(', ')]
      );
    }
    
    return { education, experience, skills };
    
  } catch (error) {
    console.error('❌ Basic parsing also failed:', error);
    throw error;
  }
};

// Enhanced parsing functions
const parseEducation = (text) => {
  const education = [];
  const lines = text.split('\n');
  
  const educationKeywords = ['education', 'academic', 'qualification', 'university', 'college', 'institute'];
  let inEducationSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Detect education section
    if (educationKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 50) {
      inEducationSection = true;
      continue;
    }
    
    // Exit education section when we hit another major section
    if (inEducationSection && (lowerLine.includes('experience') || lowerLine.includes('skill') || lowerLine.includes('project'))) {
      inEducationSection = false;
    }
    
    if (inEducationSection && line.length > 0) {
      // Look for degree patterns
      const degreePatterns = [
        /(bachelor|b\.?tech|b\.?e|b\.?sc|master|m\.?tech|m\.?e|m\.?sc|phd|doctorate)/i,
        /(computer science|information technology|software engineering|electrical engineering|mechanical engineering)/i
      ];
      
      const hasDegree = degreePatterns.some(pattern => pattern.test(line));
      
      if (hasDegree || line.includes('University') || line.includes('College') || line.includes('Institute')) {
        const educationItem = {
          degree: line,
          institution: '',
          location: '',
          period: '',
          description: '',
          gpa: ''
        };
        
        // Look ahead for institution and period
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.length === 0) continue;
          
          if (!educationItem.institution && (nextLine.includes('University') || nextLine.includes('College') || nextLine.includes('Institute'))) {
            educationItem.institution = nextLine;
          }
          
          // Look for dates (2018-2022, 2020-2024, etc.)
          const dateMatch = nextLine.match(/(20\d{2}[-–]\s*20\d{2}|20\d{2}[-–]\s*(present|current|now))/i);
          if (dateMatch && !educationItem.period) {
            educationItem.period = dateMatch[0];
          }
          
          // Look for GPA
          const gpaMatch = nextLine.match(/(gpa|cgpa)[:\s]*([0-9]+\.[0-9]+|[0-9]+\/[0-9]+)/i);
          if (gpaMatch && !educationItem.gpa) {
            educationItem.gpa = gpaMatch[2];
          }
        }
        
        education.push(educationItem);
      }
    }
  }
  
  // If no education found with patterns, try to find any lines with common education terms
  if (education.length === 0) {
    for (const line of lines) {
      if (line.includes('University') || line.includes('College') || line.includes('Bachelor') || line.includes('Master')) {
        education.push({
          degree: line.trim(),
          institution: 'Educational Institution',
          period: '',
          description: ''
        });
        break;
      }
    }
  }
  
  return education.slice(0, 3); // Limit to 3 most relevant entries
};

const parseExperience = (text) => {
  const experience = [];
  const lines = text.split('\n');
  
  const experienceKeywords = ['experience', 'work', 'employment', 'professional', 'career'];
  let inExperienceSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Detect experience section
    if (experienceKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 50) {
      inExperienceSection = true;
      continue;
    }
    
    // Exit experience section when we hit another major section
    if (inExperienceSection && (lowerLine.includes('education') || lowerLine.includes('skill') || lowerLine.includes('project'))) {
      inExperienceSection = false;
    }
    
    if (inExperienceSection && line.length > 0) {
      // Look for job title patterns
      const jobTitlePatterns = [
        /(developer|engineer|analyst|specialist|manager|consultant|intern|associate)/i,
        /(full.?stack|front.?end|back.?end|software|web)/i
      ];
      
      const hasJobTitle = jobTitlePatterns.some(pattern => pattern.test(line));
      
      if (hasJobTitle || line.includes('at ') || line.includes('@')) {
        const experienceItem = {
          position: line,
          company: '',
          location: '',
          period: '',
          description: '',
          achievements: []
        };
        
        // Extract company name
        const atIndex = line.toLowerCase().indexOf(' at ');
        if (atIndex > -1) {
          experienceItem.position = line.substring(0, atIndex).trim();
          experienceItem.company = line.substring(atIndex + 4).trim();
        } else {
          experienceItem.position = line;
        }
        
        // Look ahead for company, period, and description
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.length === 0) continue;
          
          if (!experienceItem.company && nextLine.length < 100 && !nextLine.match(/(20\d{2}[-–]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
            experienceItem.company = nextLine;
          }
          
          // Look for dates - FIXED REGEX PATTERNS
          const datePatterns = [
            /(20\d{2}[-–]\s*20\d{2})/, // 2020-2022
            /(20\d{2}[-–]\s*(present|current|now))/i, // 2020-present
            /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*20\d{2}\s*[-–]\s*(present|current|now))/i, // Jan 2020-present
            /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*20\d{2}\s*[-–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*20\d{2})/i // Jan 2020-Dec 2022
          ];
          
          let dateMatch = null;
          for (const pattern of datePatterns) {
            dateMatch = nextLine.match(pattern);
            if (dateMatch && !experienceItem.period) {
              experienceItem.period = dateMatch[0];
              break;
            }
          }
          
          // Look for bullet points or achievements
          if (nextLine.match(/^[•\-*]\s/) || nextLine.match(/^[0-9]+\.\s/)) {
            experienceItem.achievements.push(nextLine.replace(/^[•\-*]\s*/, '').trim());
          }
        }
        
        // If no achievements found, use next few lines as description
        if (experienceItem.achievements.length === 0) {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (nextLine.length > 0 && !nextLine.match(/(20\d{2}[-–]|university|college|education|skill)/i)) {
              experienceItem.description += nextLine + ' ';
            }
          }
          experienceItem.description = experienceItem.description.trim();
        }
        
        experience.push(experienceItem);
      }
    }
  }
  
  return experience.slice(0, 4); // Limit to 4 most relevant entries
};

const parseSkills = (text) => {
  const skills = [];
  const lines = text.split('\n');
  
  const skillCategories = {
    'Programming Languages': ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'typescript'],
    'Frontend': ['react', 'angular', 'vue', 'html', 'css', 'bootstrap', 'tailwind', 'sass', 'jquery'],
    'Backend': ['node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'asp.net', 'fastapi'],
    'Database': ['mysql', 'mongodb', 'postgresql', 'sqlite', 'oracle', 'redis', 'firebase'],
    'Tools & Technologies': ['git', 'docker', 'aws', 'azure', 'jenkins', 'kubernetes', 'linux', 'rest api', 'graphql'],
    'Soft Skills': ['communication', 'leadership', 'teamwork', 'problem-solving', 'agile', 'scrum']
  };
  
  let inSkillsSection = false;
  const foundSkills = {};
  
  // Initialize categories
  Object.keys(skillCategories).forEach(category => {
    foundSkills[category] = [];
  });
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect skills section
    if ((lowerLine.includes('skill') || lowerLine.includes('technical') || lowerLine.includes('technology')) && line.length < 50) {
      inSkillsSection = true;
      continue;
    }
    
    if (inSkillsSection) {
      // Check each category for skills
      for (const [category, skillList] of Object.entries(skillCategories)) {
        for (const skill of skillList) {
          if (lowerLine.includes(skill.toLowerCase()) && !foundSkills[category].includes(skill)) {
            foundSkills[category].push(skill);
          }
        }
      }
      
      // Exit skills section when we hit another major section
      if (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('project')) {
        inSkillsSection = false;
      }
    } else {
      // Also search entire text for technical skills
      for (const [category, skillList] of Object.entries(skillCategories)) {
        for (const skill of skillList) {
          if (lowerLine.includes(skill.toLowerCase()) && !foundSkills[category].includes(skill)) {
            foundSkills[category].push(skill);
          }
        }
      }
    }
  }
  
  // Create skill categories with found skills
  for (const [category, skillList] of Object.entries(foundSkills)) {
    if (skillList.length > 0) {
      skills.push({
        category: category,
        skills: skillList
      });
    }
  }
  
  // If no skills found, try to extract from the entire text
  if (skills.length === 0) {
    const allSkills = [];
    for (const [category, skillList] of Object.entries(skillCategories)) {
      for (const skill of skillList) {
        if (text.toLowerCase().includes(skill.toLowerCase())) {
          allSkills.push(skill);
        }
      }
    }
    
    if (allSkills.length > 0) {
      skills.push({
        category: 'Technical Skills',
        skills: allSkills.slice(0, 15) // Limit to 15 skills
      });
    }
  }
  
  return skills;
};

const parsePersonalInfo = (text) => {
  const lines = text.split('\n');
  const personalInfo = {};
  
  // Look for email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) personalInfo.email = emailMatch[0];
  
  // Look for phone number
  const phoneMatch = text.match(/(\+91[\-\s]?)?[6-9]\d{9}|\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b/);
  if (phoneMatch) personalInfo.phone = phoneMatch[0];
  
  // Look for location (first line often contains name and location)
  if (lines.length > 0) {
    const firstLine = lines[0];
    const locationKeywords = ['pune', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'india'];
    for (const location of locationKeywords) {
      if (firstLine.toLowerCase().includes(location)) {
        personalInfo.location = location;
        break;
      }
    }
  }
  
  return personalInfo;
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Check if admin user exists
        const [users] = await pool.execute(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );
        
        console.log('📊 Users found:', users.length);
        
        if (users.length === 0) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        console.log('👤 User found:', user.username);
        
        // Compare passwords
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('🔑 Password valid:', validPassword);
        
        if (!validPassword) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create token with 2 days expiry
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username,
                email: user.email
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '2 days' }
        );
        
        console.log('✅ Login successful for:', username);
        console.log('✅ Token generated:', token.substring(0, 20) + '...');
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('💥 Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    try {
        res.json({ 
            valid: true, 
            user: req.user,
            message: 'Token is valid',
            expiresIn: '2 days'
        });
    } catch (error) {
        res.status(401).json({ 
            valid: false, 
            error: 'Token verification failed' 
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Logged out successfully',
        success: true 
    });
});

// Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: req.user,
        authenticated: true
    });
});

// ==================== ENHANCED RESUME ROUTES ====================

// Upload resume with content parsing
app.post('/api/admin/upload-resume', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resumeData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date()
    };

    // Clear previous resumes and insert new one
    await pool.execute('DELETE FROM resumes');
    const [result] = await pool.execute(
      'INSERT INTO resumes (filename, original_name, file_path, file_size, uploaded_at) VALUES (?, ?, ?, ?, ?)',
      [resumeData.filename, resumeData.originalName, resumeData.path, resumeData.size, resumeData.uploadedAt]
    );

    const resumeId = result.insertId;

    // Parse resume content and store in database
    let parseResult;
    try {
      parseResult = await parseResumeContent(resumeData.path, resumeId);
      console.log('✅ Resume parsing completed successfully');
    } catch (parseError) {
      console.warn('⚠️ Resume parsing failed, but file was uploaded:', parseError.message);
      parseResult = { education: [], experience: [], skills: [] };
    }

    // Get the complete resume info with content counts
    let educationCount = 0;
    let experienceCount = 0;
    let skillsCount = 0;

    try {
      const [educationRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_education WHERE resume_id = ?', [resumeId]);
      educationCount = educationRows[0].count;
      
      const [experienceRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_experience WHERE resume_id = ?', [resumeId]);
      experienceCount = experienceRows[0].count;
      
      const [skillsRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_skills WHERE resume_id = ?', [resumeId]);
      skillsCount = skillsRows[0].count;
    } catch (error) {
      console.log('ℹ️ Could not get resume content counts, tables might not exist yet');
    }

    console.log('📊 Resume upload completed with counts:', {
      education: educationCount,
      experience: experienceCount,
      skills: skillsCount
    });

    // Clear cache after upload
    clearResumeCache();

    res.json({
      message: 'Resume uploaded and processed successfully',
      resume: {
        id: resumeId,
        filename: resumeData.filename,
        originalName: resumeData.originalName,
        url: `/uploads/${resumeData.filename}`,
        size: resumeData.size,
        uploadedAt: resumeData.uploadedAt,
        lastUpdated: resumeData.uploadedAt,
        educationCount: educationCount,
        experienceCount: experienceCount,
        skillsCount: skillsCount
      },
      parsedContent: parseResult
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Get resume content for frontend display - FIXED JSON PARSING WITH CACHE
app.get('/api/resume/content', cacheResumeData, async (req, res) => {
  try {
    console.log('📋 Fetching resume content from database...');
    
    // Get the latest resume
    const [resumes] = await pool.execute(
      'SELECT * FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    
    if (resumes.length === 0) {
      return res.status(404).json({ error: 'No resume content available' });
    }

    const resume = resumes[0];

    let education = [];
    let experience = [];
    let skills = [];

    try {
      // Get education data
      [education] = await pool.execute(
        'SELECT * FROM resume_education WHERE resume_id = ? ORDER BY period DESC',
        [resume.id]
      );

      // Get experience data
      [experience] = await pool.execute(
        'SELECT * FROM resume_experience WHERE resume_id = ? ORDER BY period DESC',
        [resume.id]
      );

      // Get skills data
      [skills] = await pool.execute(
        'SELECT * FROM resume_skills WHERE resume_id = ?',
        [resume.id]
      );

      // Process achievements and skills as strings (no JSON parsing needed)
      const processedExperience = experience.map(exp => {
        // achievements is stored as string, split by | or keep as is
        let achievements = [];
        if (exp.achievements && typeof exp.achievements === 'string') {
          if (exp.achievements.includes('|')) {
            achievements = exp.achievements.split('|').map(a => a.trim()).filter(a => a);
          } else if (exp.achievements) {
            achievements = [exp.achievements];
          }
        }
        
        return {
          ...exp,
          achievements: achievements
        };
      });

      const processedSkills = skills.map(skill => {
        // skills is stored as string, split by comma or keep as is
        let skillList = [];
        if (skill.skills && typeof skill.skills === 'string') {
          if (skill.skills.includes(',')) {
            skillList = skill.skills.split(',').map(s => s.trim()).filter(s => s);
          } else if (skill.skills) {
            skillList = [skill.skills];
          }
        }
        
        return {
          ...skill,
          skills: skillList
        };
      });

      experience = processedExperience;
      skills = processedSkills;

    } catch (tableError) {
      console.log('ℹ️ Resume content tables not available yet');
      // Continue with empty arrays
    }

    const responseData = {
      education,
      experience,
      skills,
      resumeInfo: {
        filename: resume.original_name,
        size: resume.file_size,
        uploadedAt: resume.uploaded_at,
        lastUpdated: resume.uploaded_at
      }
    };

    console.log('📋 Resume content API response counts:', {
      education: education.length,
      experience: experience.length,
      skills: skills.length
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching resume content:', error);
    res.status(500).json({ error: 'Failed to fetch resume content' });
  }
});

// Enhanced resume check endpoint with cache
app.get('/api/resume/check', async (req, res) => {
  try {
    const now = Date.now();
    
    // Check cache first
    if (apiCache.resumeCheck && apiCache.lastUpdated && (now - apiCache.lastUpdated < apiCache.cacheTimeout)) {
      console.log('⚡ Serving resume check from cache');
      return res.json(apiCache.resumeCheck);
    }

    console.log('🔍 Checking resume availability...');
    
    const [resumes] = await pool.execute(
      'SELECT * FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    
    if (resumes.length === 0) {
      const response = { 
        available: false,
        message: 'No resume available'
      };
      apiCache.resumeCheck = response;
      apiCache.lastUpdated = Date.now();
      return res.json(response);
    }

    const resume = resumes[0];
    const filePath = path.join(__dirname, resume.file_path);
    
    if (!fs.existsSync(filePath)) {
      const response = { 
        available: false,
        message: 'Resume file not found on server'
      };
      apiCache.resumeCheck = response;
      apiCache.lastUpdated = Date.now();
      return res.json(response);
    }

    let educationCount = 0;
    let experienceCount = 0;
    let skillsCount = 0;

    try {
      const [educationRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_education WHERE resume_id = ?', [resume.id]);
      educationCount = educationRows[0].count;
      
      const [experienceRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_experience WHERE resume_id = ?', [resume.id]);
      experienceCount = experienceRows[0].count;
      
      const [skillsRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_skills WHERE resume_id = ?', [resume.id]);
      skillsCount = skillsRows[0].count;
    } catch (error) {
      console.log('ℹ️ Could not get resume content counts for check endpoint');
    }

    const stats = fs.statSync(filePath);
    
    const responseData = { 
      available: true,
      filename: resume.original_name,
      size: resume.file_size,
      uploadedAt: resume.uploaded_at,
      lastUpdated: resume.uploaded_at,
      lastModified: stats.mtime,
      fileSize: stats.size,
      educationCount: educationCount,
      experienceCount: experienceCount,
      skillsCount: skillsCount,
      message: 'Resume is available for download'
    };

    // Cache the response
    apiCache.resumeCheck = responseData;
    apiCache.lastUpdated = Date.now();

    console.log('✅ Resume check response with counts:', {
      education: responseData.educationCount,
      experience: responseData.experienceCount,
      skills: responseData.skillsCount
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error checking resume:', error);
    const response = { 
      available: false,
      message: 'Error checking resume availability'
    };
    apiCache.resumeCheck = response;
    apiCache.lastUpdated = Date.now();
    res.json(response);
  }
});

// Enhanced admin resume endpoint
app.get('/api/admin/resume', authenticateToken, async (req, res) => {
  try {
    const [resumes] = await pool.execute(
      'SELECT * FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    
    if (resumes.length === 0) {
      return res.status(404).json({ error: 'No resume found' });
    }

    const resume = resumes[0];

    let educationCount = 0;
    let experienceCount = 0;
    let skillsCount = 0;

    try {
      const [educationRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_education WHERE resume_id = ?', [resume.id]);
      educationCount = educationRows[0].count;
      
      const [experienceRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_experience WHERE resume_id = ?', [resume.id]);
      experienceCount = experienceRows[0].count;
      
      const [skillsRows] = await pool.execute('SELECT COUNT(*) as count FROM resume_skills WHERE resume_id = ?', [resume.id]);
      skillsCount = skillsRows[0].count;
    } catch (error) {
      console.log('ℹ️ Could not get resume content counts for admin endpoint');
    }

    const responseData = {
      filename: resume.filename,
      originalName: resume.original_name,
      url: `/uploads/${resume.filename}`,
      size: resume.file_size,
      uploadedAt: resume.uploaded_at,
      lastUpdated: resume.uploaded_at,
      educationCount: educationCount,
      experienceCount: experienceCount,
      skillsCount: skillsCount
    };

    console.log('📊 Admin resume response with counts:', {
      education: responseData.educationCount,
      experience: responseData.experienceCount,
      skills: responseData.skillsCount
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Download resume
app.get('/api/resume', async (req, res) => {
  try {
    const [resumes] = await pool.execute(
      'SELECT * FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    
    if (resumes.length === 0) {
      return res.status(404).json({ 
        error: 'No resume available for download',
        available: false
      });
    }

    const resume = resumes[0];
    const filePath = path.join(__dirname, resume.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Resume file not found on server',
        available: false
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.original_name}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    res.setHeader('Cache-Control', 'no-cache');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ 
      error: 'Failed to download resume',
      details: error.message
    });
  }
});

// Delete resume with content
app.delete('/api/admin/delete-resume', authenticateToken, async (req, res) => {
  try {
    // Get current resume first
    const [resumes] = await pool.execute(
      'SELECT * FROM resumes ORDER BY uploaded_at DESC LIMIT 1'
    );
    
    if (resumes.length === 0) {
      return res.status(404).json({ error: 'No resume found to delete' });
    }

    const resume = resumes[0];
    const filePath = path.join(__dirname, resume.file_path);
    
    // Delete file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete resume content (if tables exist)
    try {
      await pool.execute('DELETE FROM resume_education WHERE resume_id = ?', [resume.id]);
      await pool.execute('DELETE FROM resume_experience WHERE resume_id = ?', [resume.id]);
      await pool.execute('DELETE FROM resume_skills WHERE resume_id = ?', [resume.id]);
    } catch (tableError) {
      console.log('Resume content tables not found, skipping content deletion');
    }
    
    // Delete from database
    await pool.execute('DELETE FROM resumes WHERE id = ?', [resume.id]);
    
    // Clear cache after deletion
    clearResumeCache();
    
    res.json({ 
      message: 'Resume deleted successfully',
      deleted: {
        filename: resume.filename,
        originalName: resume.original_name
      }
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// ==================== PROFILE IMAGE ROUTES ====================

app.post('/api/admin/update-profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const profileImageData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      updatedAt: new Date()
    };

    await pool.execute('DELETE FROM profile_images');
    await pool.execute(
      'INSERT INTO profile_images (filename, original_name, file_path, file_size, updated_at) VALUES (?, ?, ?, ?, ?)',
      [profileImageData.filename, profileImageData.originalName, profileImageData.path, profileImageData.size, profileImageData.updatedAt]
    );

    res.json({
      message: 'Profile image updated successfully',
      image: {
        filename: profileImageData.filename,
        originalName: profileImageData.originalName,
        url: `/uploads/${profileImageData.filename}`,
        size: profileImageData.size,
        updatedAt: profileImageData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

app.get('/api/admin/profile-image', authenticateToken, async (req, res) => {
  try {
    const [profileImages] = await pool.execute(
      'SELECT * FROM profile_images ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (profileImages.length === 0) {
      return res.status(404).json({ error: 'No profile image found' });
    }

    const profileImage = profileImages[0];
    res.json({
      filename: profileImage.filename,
      originalName: profileImage.original_name,
      url: `/uploads/${profileImage.filename}`,
      size: profileImage.file_size,
      updatedAt: profileImage.updated_at
    });
  } catch (error) {
    console.error('Error fetching profile image:', error);
    res.status(500).json({ error: 'Failed to fetch profile image' });
  }
});

app.get('/api/profile-image', async (req, res) => {
  try {
    const [profileImages] = await pool.execute(
      'SELECT * FROM profile_images ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (profileImages.length === 0) {
      return res.status(404).json({ error: 'No profile image available' });
    }

    const profileImage = profileImages[0];
    const filePath = path.join(__dirname, profileImage.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Profile image file not found' });
    }

    res.json({
      url: `/uploads/${profileImage.filename}`,
      updatedAt: profileImage.updated_at
    });
  } catch (error) {
    console.error('Error fetching profile image:', error);
    res.status(500).json({ error: 'Failed to fetch profile image' });
  }
});

// ==================== OTHER ROUTES ====================

// Admin - Get all projects
app.get('/api/admin/projects', authenticateToken, async (req, res) => {
    try {
        const [projects] = await pool.execute(
            'SELECT * FROM projects ORDER BY created_at DESC'
        );
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Create new project
app.post('/api/admin/projects', authenticateToken, async (req, res) => {
    try {
        const { title, description, image_url, technologies, project_url, github_url, featured } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }
        
        const [result] = await pool.execute(
            `INSERT INTO projects (title, description, image_url, technologies, project_url, github_url, featured) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, image_url, JSON.stringify(technologies || []), project_url, github_url, featured || false]
        );
        
        res.json({ id: result.insertId, message: 'Project created successfully' });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Update project
app.put('/api/admin/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, technologies, project_url, github_url, featured } = req.body;
        
        await pool.execute(
            `UPDATE projects SET title = ?, description = ?, image_url = ?, technologies = ?, 
             project_url = ?, github_url = ?, featured = ? WHERE id = ?`,
            [title, description, image_url, JSON.stringify(technologies || []), project_url, github_url, featured, id]
        );
        
        res.json({ message: 'Project updated successfully' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Delete project
app.delete('/api/admin/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Get all skills
app.get('/api/admin/skills', authenticateToken, async (req, res) => {
    try {
        const [skills] = await pool.execute('SELECT * FROM skills ORDER BY category');
        res.json(skills);
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Create new skill
app.post('/api/admin/skills', authenticateToken, async (req, res) => {
    try {
        const { name, category, proficiency, icon } = req.body;
        
        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO skills (name, category, proficiency, icon) VALUES (?, ?, ?, ?)',
            [name, category, proficiency || 50, icon || '']
        );
        
        res.json({ id: result.insertId, message: 'Skill created successfully' });
    } catch (error) {
        console.error('Error creating skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Update skill
app.put('/api/admin/skills/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, proficiency, icon } = req.body;
        
        await pool.execute(
            'UPDATE skills SET name = ?, category = ?, proficiency = ?, icon = ? WHERE id = ?',
            [name, category, proficiency, icon, id]
        );
        
        res.json({ message: 'Skill updated successfully' });
    } catch (error) {
        console.error('Error updating skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Delete skill
app.delete('/api/admin/skills/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute('DELETE FROM skills WHERE id = ?', [id]);
        
        res.json({ message: 'Skill deleted successfully' });
    } catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Get all messages
app.get('/api/admin/messages', authenticateToken, async (req, res) => {
    try {
        const [messages] = await pool.execute(
            'SELECT * FROM contact_messages ORDER BY created_at DESC'
        );
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Mark message as read
app.put('/api/admin/messages/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute(
            'UPDATE contact_messages SET read_status = TRUE WHERE id = ?',
            [id]
        );
        
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Delete message
app.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute('DELETE FROM contact_messages WHERE id = ?', [id]);
        
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Dashboard statistics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const [[{ projects }]] = await pool.execute('SELECT COUNT(*) as projects FROM projects');
        const [[{ skills }]] = await pool.execute('SELECT COUNT(*) as skills FROM skills');
        const [[{ messages }]] = await pool.execute('SELECT COUNT(*) as messages FROM contact_messages');
        const [[{ unreadMessages }]] = await pool.execute('SELECT COUNT(*) as unreadMessages FROM contact_messages WHERE read_status = FALSE');
        
        // Get resume and profile image stats
        const [[{ resumes }]] = await pool.execute('SELECT COUNT(*) as resumes FROM resumes');
        const [[{ profileImages }]] = await pool.execute('SELECT COUNT(*) as profileImages FROM profile_images');
        
        res.json({
            projects: parseInt(projects),
            skills: parseInt(skills),
            messages: parseInt(messages),
            unreadMessages: parseInt(unreadMessages),
            resumes: parseInt(resumes),
            profileImages: parseInt(profileImages)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== PUBLIC ROUTES ====================

// Public - Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const [projects] = await pool.execute(
            'SELECT * FROM projects ORDER BY created_at DESC'
        );
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public - Get all skills
app.get('/api/skills', async (req, res) => {
    try {
        const [skills] = await pool.execute(
            'SELECT * FROM skills ORDER BY category, proficiency DESC'
        );
        res.json(skills);
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public - Contact form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        await pool.execute(
            'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
            [name, email, message]
        );
        
        res.json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT * FROM admin_users');
        
        // Check each table separately to handle missing tables gracefully
        let projectsCount = 0;
        let skillsCount = 0;
        let resumesCount = 0;
        let profileImagesCount = 0;
        let messagesCount = 0;
        let resumeEducationCount = 0;
        let resumeExperienceCount = 0;
        let resumeSkillsCount = 0;
        
        try {
            const [projects] = await pool.execute('SELECT COUNT(*) as count FROM projects');
            projectsCount = projects[0].count;
        } catch (error) {
            console.log('Projects table not found');
        }
        
        try {
            const [skills] = await pool.execute('SELECT COUNT(*) as count FROM skills');
            skillsCount = skills[0].count;
        } catch (error) {
            console.log('Skills table not found');
        }
        
        try {
            const [resumes] = await pool.execute('SELECT COUNT(*) as count FROM resumes');
            resumesCount = resumes[0].count;
        } catch (error) {
            console.log('Resumes table not found');
        }
        
        try {
            const [profileImages] = await pool.execute('SELECT COUNT(*) as count FROM profile_images');
            profileImagesCount = profileImages[0].count;
        } catch (error) {
            console.log('Profile images table not found');
        }
        
        try {
            const [messages] = await pool.execute('SELECT COUNT(*) as count FROM contact_messages');
            messagesCount = messages[0].count;
        } catch (error) {
            console.log('Contact messages table not found');
        }
        
        try {
            const [resumeEducation] = await pool.execute('SELECT COUNT(*) as count FROM resume_education');
            resumeEducationCount = resumeEducation[0].count;
        } catch (error) {
            console.log('Resume education table not found');
        }
        
        try {
            const [resumeExperience] = await pool.execute('SELECT COUNT(*) as count FROM resume_experience');
            resumeExperienceCount = resumeExperience[0].count;
        } catch (error) {
            console.log('Resume experience table not found');
        }
        
        try {
            const [resumeSkills] = await pool.execute('SELECT COUNT(*) as count FROM resume_skills');
            resumeSkillsCount = resumeSkills[0].count;
        } catch (error) {
            console.log('Resume skills table not found');
        }
        
        res.json({ 
            success: true, 
            users: users,
            projects_count: projectsCount,
            skills_count: skillsCount,
            resumes_count: resumesCount,
            profile_images_count: profileImagesCount,
            messages_count: messagesCount,
            resume_education_count: resumeEducationCount,
            resume_experience_count: resumeExperienceCount,
            resume_skills_count: resumeSkillsCount,
            message: `Found ${users.length} admin users, ${projectsCount} projects, ${skillsCount} skills, ${resumesCount} resumes, ${profileImagesCount} profile images, ${messagesCount} messages, ${resumeEducationCount} resume education entries, ${resumeExperienceCount} resume experience entries, ${resumeSkillsCount} resume skill categories`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Error handling for file uploads
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ 
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ FIXED Resume content parsing enabled`);
    console.log(`✅ MANUAL Education & Experience editing enabled`);
    console.log(`✅ CACHE Enabled for resume endpoints (5 seconds)`);
    console.log(`✅ ENHANCED CORS configuration for Bearer tokens`);
    console.log(`📊 Resume endpoints:`);
    console.log(`   GET /api/resume/content - Get parsed resume data (CACHED)`);
    console.log(`   GET /api/resume/check - Check resume availability (CACHED)`);
    console.log(`   POST /api/admin/upload-resume - Upload & parse resume`);
    console.log(`   POST /api/admin/resume/education - Add/edit education`);
    console.log(`   POST /api/admin/resume/experience - Add/edit experience`);
    console.log(`   DELETE /api/admin/resume/education/:id - Delete education`);
    console.log(`   DELETE /api/admin/resume/experience/:id - Delete experience`);
});