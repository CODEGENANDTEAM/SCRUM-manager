import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../database/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  deleteField,
  arrayUnion,
  arrayRemove,
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../../data/hooks/useAuth';
import './ProjectsPage.css';

// --- (Modal components remain the same) ---
const Modal = ({ children, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => {
  return (
    <Modal onClose={onCancel}>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          Confirm Delete
        </button>
      </div>
    </Modal>
  );
};

const ProjectModal = ({ project, onClose, onSave }) => {
  const [name, setName] = useState(project ? project.name : '');
  const [description, setDescription] = useState(project ? project.description : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    
    onSave({
      ...project, 
      name,
      description
    });
  };

  return (
    <Modal onClose={onClose}>
      <h2>{project ? 'Edit Project' : 'Create New Project'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="projectName">Project Name</label>
          <input 
            type="text"
            id="projectName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="projectDesc">Description</label>
          <textarea
            id="projectDesc"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save Project</button>
        </div>
      </form>
    </Modal>
  );
};

const ManageMembersModal = ({ project, onClose, user, userProfile }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  const currentUserProjectRole = project.teamRoles[user.uid];
  const currentUserGlobalRole = userProfile.role;
  const canManageMembers = currentUserProjectRole === 'owner' || currentUserProjectRole === 'admin' || currentUserGlobalRole === 'super-admin';

  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!project.teamRoles) return;
      
      const memberUIDs = Object.keys(project.teamRoles);
      const memberDetails = [];
      
      for (const uid of memberUIDs) {
        const userQuery = query(collection(db, 'users'), where('uid', '==', uid));
        const userDoc = await getDocs(userQuery);
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          memberDetails.push({
            uid: userData.uid,
            email: userData.email,
            globalRole: userData.role,
            projectRole: project.teamRoles[uid]
          });
        }
      }
      setMembers(memberDetails);
    };
    fetchMemberDetails();
  }, [project.teamRoles]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!canManageMembers) {
      setError("You don't have permission to add members.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found with that email address.');
      }

      const userDoc = querySnapshot.docs[0].data();
      const newMemberUid = userDoc.uid;

      if (project.teamRoles[newMemberUid]) {
        throw new Error('User is already a member of this project.');
      }

      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`teamRoles.${newMemberUid}`]: 'member',
        teamUids: arrayUnion(newMemberUid)
      });
      
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveMember = async (targetMember) => {
    setError(null);
    if (targetMember.globalRole === 'super-admin') {
      setError("The super-admin cannot be removed from any project.");
      return;
    }
    if (targetMember.projectRole === 'owner') {
      setError("The project owner cannot be removed. You must transfer ownership first.");
      return;
    }
    if (!canManageMembers) {
      setError("You must be an owner or admin to remove members.");
      return;
    }
    if (targetMember.uid === user.uid) {
      setError("You cannot remove yourself.");
      return;
    }
    setLoading(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`teamRoles.${targetMember.uid}`]: deleteField(),
        teamUids: arrayRemove(targetMember.uid)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Manage Members for {project.name}</h2>
      
      {canManageMembers && (
        <form onSubmit={handleAddMember} className="add-member-form">
          <div className="form-group">
            <label htmlFor="memberEmail">Add Member by Email</label>
            <input 
              type="email"
              id="memberEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      )}
      {error && <p className="error-message">{error}</p>}
      
      <hr className="divider" />
      
      <h3>Current Members</h3>
      <ul className="members-list">
        {members.map(member => (
          <li key={member.uid} className="member-item">
            <div>
              <span className="member-email">{member.email}</span>
              <span className="member-role">{member.projectRole}</span>
              {member.globalRole === 'super-admin' && (
                <span className="member-role admin">Super Admin</span>
              )}
            </div>
            {canManageMembers && member.uid !== user.uid && (
              <button 
                className="btn-remove"
                onClick={() => handleRemoveMember(member)}
                disabled={loading}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
};


// --- Main Projects Page Component ---
const ProjectsPage = () => {
  const { user, userProfile } = useAuth(); // <-- Get userProfile
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // 1. READ Projects (UPDATED FOR SUPER-ADMIN)
  useEffect(() => {
    // Wait for user and userProfile to be loaded
    if (!user || !userProfile) {
      setLoading(true);
      return;
    } 
    setLoading(true);

    const projectsRef = collection(db, 'projects');
    let q; // Declare query variable

    // --- THIS IS THE FIX ---
    if (userProfile.role === 'super-admin') {
      // Super-admin sees all projects
      console.log("User is super-admin, fetching all projects.");
      q = query(projectsRef);
    } else {
      // Regular users see only projects they are in
      console.log("User is not super-admin, fetching user's projects.");
      q = query(projectsRef, where('teamUids', 'array-contains', user.uid));
    }
    // --- END OF FIX ---

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects. Check security rules or console for index link.");
      setLoading(false);
    });
    
    // Add userProfile to dependency array
    return () => unsubscribe();
  }, [user, userProfile]);

  // 2. CREATE and UPDATE Project
  const handleSaveProject = async (projectData) => {
    // ... (This function remains unchanged)
    const { id, ...data } = projectData;
    if (id) {
      try {
        const projectRef = doc(db, 'projects', id);
        await updateDoc(projectRef, { name: data.name, description: data.description });
      } catch (err) { setError("Failed to update project."); }
    } else {
      try {
        await addDoc(collection(db, 'projects'), {
          ...data,
          ownerId: user.uid,
          teamRoles: { [user.uid]: 'owner' },
          teamUids: [user.uid],
          status: 'active',
          createdAt: serverTimestamp()
        });
      } catch (err) { setError("Failed to create project."); }
    }
    setModal(null);
  };

  // 3. DELETE Project (UPDATED FOR SUPER-ADMIN)
  const requestDeleteProject = (project) => {
    const userProjectRole = project.teamRoles[user.uid];
    
    // Allow delete if user is owner OR super-admin
    if (userProjectRole !== 'owner' && userProfile.role !== 'super-admin') {
      // This alert is temporary, a modal would be better
      alert("You must be the project owner or a super-admin to delete this project.");
      return;
    }
    setProjectToDelete(project);
    setConfirmModalOpen(true);
  };

  const confirmDeleteProject = async () => {
    // ... (This function remains unchanged)
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      setConfirmModalOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      setError("Failed to delete project.");
      setConfirmModalOpen(false);
    }
  };

  const cancelDelete = () => {
    setConfirmModalOpen(false);
    setProjectToDelete(null);
  };

  // --- Modal Controls ---
  const openModal = (type, project = null) => {
    setEditingProject(project);
    setModal(type);
  };

  return (
    <div className="page-container projects-page">
      {/* --- Modals --- */}
      {modal === 'create' && (
        <ProjectModal 
          onClose={() => setModal(null)} 
          onSave={handleSaveProject} 
        />
      )}
      {modal === 'edit' && editingProject && (
        <ProjectModal 
          project={editingProject}
          onClose={() => setModal(null)} 
          onSave={handleSaveProject} 
        />
      )}
      {modal === 'members' && editingProject && (
        <ManageMembersModal
          project={editingProject}
          onClose={() => setModal(null)}
          user={user}
          userProfile={userProfile}
        />
      )}
      {confirmModalOpen && projectToDelete && (
        <ConfirmModal
          title={`Delete Project: ${projectToDelete.name}`}
          message="Are you sure? This action is permanent and cannot be undone."
          onConfirm={confirmDeleteProject}
          onCancel={cancelDelete}
        />
      )}
      
      {/* --- Page Content --- */}
      <section className="projects-section">
        <div className="section-header">
          <h2>
            {userProfile?.role === 'super-admin' ? "All Company Projects" : "My Projects"}
          </h2>
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            + New Project
          </button>
        </div>
        
        {loading && <p>Loading projects...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && projects.length === 0 && (
          <p>No projects found. Click "New Project" to start!</p>
        )}

        <div className="project-grid">
          {projects.map(project => {
            const userRole = project.teamRoles[user.uid];
            const canManage = userRole === 'owner' || userRole === 'admin' || userProfile.role === 'super-admin';
            
            return (
              <div key={project.id} className="project-card-new">
                <div className="card-header">
                  <span className="card-status-badge">{project.status}</span>
                  {canManage && (
                    <div className="card-actions-dropdown">
                      <button className="card-action-trigger">…</button>
                      <div className="card-action-menu">
                        <button onClick={() => openModal('edit', project)}>Edit Details</button>
                        <button onClick={() => openModal('members', project)}>Manage Members</button>
                        <button onClick={() => requestDeleteProject(project)} className="action-delete">Delete Project</button>
                      </div>
                    </div>
                  )}
                </div>
                <Link to={`/project/${project.id}`} className="project-card-link">
                  <h3 className="card-title">{project.name}</h3>
                  <p className="card-description">{project.description || 'No description'}</p>
                </Link>
                <div className="card-footer">
                  <span className="card-members">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372m-10.75 0a9.38 9.38 0 0 0 2.625.372M12 6.875c-1.125 0-2.25.6-3 1.375m0 0a3.375 3.375 0 0 1-3 1.375m0 0c-1.125 0-2.25.6-3 1.375M12 6.875c1.125 0 2.25.6 3 1.375m0 0a3.375 3.375 0 0 0 3 1.375m0 0c1.125 0 2.25.6 3 1.375M12 6.875v9.375m0-9.375a3.375 3.375 0 0 1 3 1.375m0 0c1.125 0 2.25.6 3 1.375m-15 0c1.125 0 2.25.6 3 1.375m0 0a3.375 3.375 0 0 0 3 1.375m0 0c1.125 0 2.25.6 3 1.375M6 6.875v9.375m0 0a3.375 3.375 0 0 0 3 1.375m0 0c1.125 0 2.25.6 3 1.375m0 0a3.375 3.375 0 0 1 3 1.375m0 0c1.125 0 2.25.6 3 1.375" />
                    </svg>
                    {project.teamUids.length} members
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ProjectsPage;