import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sprints.css';
import { useAuth } from '../../data/hooks/useAuth';
import { db } from '../../database/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// --- Reusable Modal Component ---
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

// --- Reusable Confirmation Modal ---
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

// --- Create/Edit Sprint Modal (UPDATED) ---
const SprintModal = ({ projects, onClose, onSave, sprint }) => {
  const isEditMode = !!sprint;
  const [projectId, setProjectId] = useState(sprint?.projectId || (projects[0]?.id || ''));
  const [sprintName, setSprintName] = useState(sprint?.name || '');
  const [sprintGoal, setSprintGoal] = useState(sprint?.goal || '');
  const [startDate, setStartDate] = useState(sprint?.startDate || '');
  const [endDate, setEndDate] = useState(sprint?.endDate || '');
  const [velocity, setVelocity] = useState(sprint?.velocityTarget || '');

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...sprint,
      projectId,
      name: sprintName,
      goal: sprintGoal,
      startDate,
      endDate,
      velocityTarget: Number(velocity) || 0,
    });
  };

  return (
    <Modal onClose={onClose}>
      <h2>{isEditMode ? 'Edit Sprint' : 'Create New Sprint'}</h2>
      <p>Plan a new sprint for your team</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project">Project</label>
          <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={isEditMode}>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {isEditMode && !projects.find(p => p.id === projectId) && (
              <option value={projectId}>Archived Project</option>
            )}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="sprintName">Sprint Name</label>
          <input id="sprintName" type="text" value={sprintName} onChange={(e) => setSprintName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="sprintGoal">Sprint Goal</label>
          <textarea id="sprintGoal" rows="3" value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)}></textarea>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input 
              id="startDate" 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              min={today} // <-- PREVENT PAST DATES
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input 
              id="endDate" 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              min={startDate || today} // <-- PREVENT DATES BEFORE START DATE
              required 
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="velocity">Velocity Target (Story Points)</label>
          <input id="velocity" type="number" value={velocity} onChange={(e) => setVelocity(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            {isEditMode ? 'Save Changes' : 'Create Sprint'}
          </button>
        </div>
      </form>
    </Modal>
  );
};


// --- Sprint Card Component ---
const SprintCard = ({ sprint, project, tasks, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const { totalSP, completedSP } = useMemo(() => {
    let total = 0;
    let completed = 0;
    
    tasks.forEach(task => {
      const points = task.storyPoints || 0;
      total += points;
      if (task.status === 'Done') {
        completed += points;
      }
    });
    
    return { totalSP: total, completedSP: completed };
  }, [tasks]);

  const progressPercent = totalSP === 0 ? 0 : (completedSP / totalSP) * 100;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  const dateRange = `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`;

  return (
    <div className="sprint-card-new">
      <div className="sprint-card-header">
        <div>
          <h3 className="sprint-card-title">{sprint.name}</h3>
          <p className="sprint-card-project">{project?.name || 'Loading...'}</p>
        </div>
        <span className="sprint-status-badge">{sprint.status}</span>
      </div>
      
      <div className="sprint-card-body">
        <p className="sprint-card-label">Sprint Goal</p>
        <p className="sprint-card-goal">{sprint.goal || 'No goal set.'}</p>
        
        <p className="sprint-card-label">Dates</p>
        <p className="sprint-card-date">{dateRange}</p>

        <p className="sprint-card-label">Progress</p>
        <div className="sprint-card-velocity">
          <span>{completedSP} / {totalSP} SP</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      
      <div className="sprint-card-footer">
        <button className="btn btn-icon" onClick={() => onEdit(sprint)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.25M18 9.75l-8.932 8.931a4.5 4.5 0 0 1-1.897 1.13L6 21l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
        </button>
        <button className="btn btn-icon btn-danger-icon" onClick={() => onDelete(sprint)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.578 0c-.265.06-.52.122-.77.188m15.326 0A48.1 48.1 0 0 0 12 5.342a48.1 48.1 0 0 0-7.524.397M12 5.342V3m0 2.342a3.375 3.375 0 0 1 3.375 3.375v.001c0 1.862-1.513 3.375-3.375 3.375S8.625 10.575 8.625 8.714v-.001a3.375 3.375 0 0 1 3.375-3.375Z" /></svg>
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/sprint/${sprint.id}`)}>
          View Board
        </button>
      </div>
    </div>
  );
};


// --- Sprints Page Component ---
const Sprints = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modal, setModal] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState(null);
  const [sprintToDelete, setSprintToDelete] = useState(null);

  // 1. Fetch user's projects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where(`teamUids`, 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => setError(err.message));
    return () => unsub();
  }, [user]);

  // 2. Fetch all sprints from user's projects
  useEffect(() => {
    if (projects.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const projectIds = projects.map(p => p.id);
    if(projectIds.length === 0) {
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, 'sprints'), where('projectId', 'in', projectIds));
    
    const unsub = onSnapshot(q, (snapshot) => {
      setSprints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setError(err.message));
    return () => unsub();
  }, [projects]);

  // 3. Fetch tasks for all visible sprints
  useEffect(() => {
    if (sprints.length === 0) return;
    const sprintIds = sprints.map(s => s.id);
    if(sprintIds.length === 0) return;

    const q = query(collection(db, 'tasks'), where('sprintId', 'in', sprintIds));
    const unsub = onSnapshot(q, (snapshot) => {
      const tasksBySprint = {};
      snapshot.docs.forEach(doc => {
        const task = {id: doc.id, ...doc.data()};
        if (!tasksBySprint[task.sprintId]) {
          tasksBySprint[task.sprintId] = [];
        }
        tasksBySprint[task.sprintId].push(task);
      });
      setTasks(tasksBySprint);
    }, (err) => setError(err.message));
    return () => unsub();
  }, [sprints]);

  // 4. Handle Save/Edit Sprint
  const handleSaveSprint = async (sprintData) => {
    setError(null);
    const { id, ...data } = sprintData;
    
    try {
      if (id) {
        const sprintRef = doc(db, 'sprints', id);
        await updateDoc(sprintRef, data);
      } else {
        await addDoc(collection(db, 'sprints'), {
          ...data,
          status: 'Upcoming',
          isLocked: false,
          createdAt: serverTimestamp(),
        });
      }
      setModal(null);
    } catch (err) {
      console.error("Error saving sprint: ", err);
      setError(err.message);
    }
  };

  // 5. Handle Delete Sprint
  const requestDeleteSprint = (sprint) => {
    setSprintToDelete(sprint);
    setConfirmModalOpen(true);
  };
  const confirmDeleteSprint = async () => {
    setError(null);
    if (!sprintToDelete) return;
    try {
      // TODO: Also delete all tasks in this sprint (or move them to backlog)
      await deleteDoc(doc(db, 'sprints', sprintToDelete.id));
      setConfirmModalOpen(false);
      setSprintToDelete(null);
    } catch (err) {
      console.error("Error deleting sprint: ", err);
      setError(err.message);
    }
  };

  return (
    <div className="page-container">
      {modal === 'create' && (
        <SprintModal
          projects={projects}
          onClose={() => setModal(null)}
          onSave={handleSaveSprint}
        />
      )}
      {modal === 'edit' && (
        <SprintModal
          projects={projects}
          onClose={() => setModal(null)}
          onSave={handleSaveSprint}
          sprint={sprintToEdit}
        />
      )}
      {confirmModalOpen && (
        <ConfirmModal
          title={`Delete Sprint: ${sprintToDelete.name}`}
          message="Are you sure? This action is permanent."
          onConfirm={confirmDeleteSprint}
          onCancel={() => setConfirmModalOpen(false)}
        />
      )}

      <div className="section-header">
        <div>
          <h1>Sprint Planning</h1>
          <p>Manage your sprints and plan upcoming work.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setModal('create')}
          disabled={projects.length === 0}
        >
          + New Sprint
        </button>
      </div>
      
      {error && (
        <div className="error-message-full-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="sprint-list-container">
        <h2 className="sprint-list-header">Upcoming Sprints</h2>
        {loading && <p>Loading sprints...</p>}
        {!loading && sprints.length === 0 && !error && (
          <p>No sprints found. Create one to get started!</p>
        )}
        <div className="sprint-grid">
          {sprints.map(sprint => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              project={projects.find(p => p.id === sprint.projectId)}
              tasks={tasks[sprint.id] || []}
              onEdit={() => { setSprintToEdit(sprint); setModal('edit'); }}
              onDelete={() => requestDeleteSprint(sprint)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sprints;