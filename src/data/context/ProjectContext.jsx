import React, { createContext, useContext, useState } from 'react';

export const ProjectContext = createContext();

export const useProjects = () => {
  return useContext(ProjectContext);
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  // TODO: Add functions to fetch/update projects from Firebase

  const value = {
    projects,
    activeProject,
    setProjects,
    setActiveProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};