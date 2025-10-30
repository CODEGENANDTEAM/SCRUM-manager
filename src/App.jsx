import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './sections/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import ProjectBacklog from './pages/ProjectBacklog/ProjectBacklog';
import SprintBoard from './pages/SprintBoard/SprintBoard';
import { useAuth } from './data/hooks/useAuth'; // <-- IMPORT
import Sprints from './pages/Sprints/Sprints';
import MyWork from './pages/MyWork/MyWork';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import Timeline from './pages/Timeline/Timeline';
// This component protects our routes
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    // If no user, redirect to login
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />
      
      <Route 
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="mywork" element={<MyWork />} />
            <Route path="sprints" element={<Sprints />} /> {/* <-- ADD THIS */}
            <Route path="project/:projectId" element={<ProjectBacklog />} />
            <Route path="sprint/:sprintId" element={<SprintBoard />} />
            <Route path="timeline" element={<Timeline />} />
            {/* ... other routes */}
            <Route path="projects" element={<ProjectsPage />} />
          </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;