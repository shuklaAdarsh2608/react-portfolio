import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './AdminLayout'
import DashboardHome from './DashboardHome'
import ProjectsManagement from './ProjectsManagement'
import SkillsManagement from './SkillsManagement'
import MessagesManagement from './MessagesManagement'
import ResumeManager from './ResumeManager'

const AdminDashboard = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="projects" element={<ProjectsManagement />} />
        <Route path="skills" element={<SkillsManagement />} />
        <Route path="messages" element={<MessagesManagement />} />
        <Route path="resume" element={<ResumeManager />} />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminDashboard