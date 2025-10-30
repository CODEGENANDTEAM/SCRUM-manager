import React, { useState, useEffect } from 'react';
import { db, auth } from '../../database/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  where,
  getDocs,
  deleteDoc // <-- IMPORT deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../../data/hooks/useAuth'; // <-- IMPORT useAuth
import './SprintBoard.css';

// Reusable Modal Component
const Modal = ({ children, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

// --- Helper: Find emails in text ---
const parseMentions = (text) => {
  const emailRegex = /@([\w.-]+@[\w.-]+\.[a-zA-Z]{2,})/g;
  const matches = text.match(emailRegex);
  if (!matches) return [];
  // Return just the email, without the '@'
  return matches.map(match => match.substring(1));
};

// --- Helper: Create notifications ---
const createNotifications = async (emails, task, sprint) => {
  if (!emails || emails.length === 0) return;
  const usersRef = collection(db, 'users');
  const uniqueEmails = [...new Set(emails)];
  for (const email of uniqueEmails) {
    const q = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(q);
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0].data();
      const targetUserId = userDoc.uid;
      if (targetUserId === auth.currentUser.uid) continue;
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        message: `${auth.currentUser.email} mentioned you in task: "${task.title}"`,
        link: `/sprint/${task.sprintId}`,
        isRead: false,
        createdAt: serverTimestamp(),
        triggerByEmail: auth.currentUser.email
      });
    }
  }
};


// --- Comment Feed Component (UPDATED) ---
const CommentFeed = ({ task, sprint }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth(); // <-- Get the current user

  // 1. Fetch comments
  useEffect(() => {
    if (!task?.id) return;
    const commentsRef = collection(db, 'tasks', task.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [task?.id]);

  // 2. Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'tasks', task.id, 'comments'), {
        content: newComment,
        authorId: user.uid, // <-- Use user.uid
        authorEmail: user.email, // <-- Use user.email
        createdAt: serverTimestamp()
      });
      const mentionedEmails = parseMentions(newComment);
      if (mentionedEmails.length > 0) {
        await createNotifications(mentionedEmails, task, sprint);
      }
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment: ", err);
    }
    setLoading(false);
  };

  // --- NEW: Handle Delete Comment ---
  const handleDeleteComment = async (commentId) => {
    // Optional: Add a confirmation modal here
    try {
      const commentRef = doc(db, 'tasks', task.id, 'comments', commentId);
      await deleteDoc(commentRef);
    } catch (err) {
      console.error("Error deleting comment: ", err);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '...';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  return (
    <div className="comment-section">
      <h3 className="comment-title">Activity</h3>
      <div className="comment-feed">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <span className="comment-author">{comment.authorEmail}</span>
              {/* --- NEW: Show delete button if user is author --- */}
              {comment.authorId === user.uid && (
                <button 
                  className="btn-delete-comment"
                  onClick={() => handleDeleteComment(comment.id)}
                  title="Delete comment"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="comment-content">{comment.content}</div>
            <div className="comment-date">{formatTimestamp(comment.createdAt)}</div>
          </div>
        ))}
        {comments.length === 0 && <p>No comments yet. Type `@email.com` to mention a teammate.</p>}
      </div>
      <form onSubmit={handleCommentSubmit} className="comment-form">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
};

// --- Main Task Modal (UPDATED) ---
const TaskModal = ({ task, projectId, sprint, onClose, onSave, onDelete }) => {
  const isEditMode = !!task;
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    type: task?.type || 'Story',
    storyPoints: task?.storyPoints || 0,
    assigneeId: task?.assigneeId || '',
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [loadingMembers, setLoadingMembers] = useState(true);

  // 1. Fetch team members (with error handling)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setLoadingMembers(true);
      if (!projectId) {
        console.error("TaskModal: No Project ID provided.");
        setLoadingMembers(false);
        return;
      }
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) {
          console.error(`TaskModal: Project not found: ${projectId}`);
          setLoadingMembers(false);
          return;
        }
        const projectData = projectSnap.data();
        if (!projectData.teamRoles) {
          console.error("TaskModal: Project data is missing 'teamRoles' map.");
          setLoadingMembers(false);
          return;
        }
        const memberUIDs = Object.keys(projectData.teamRoles);
        if (memberUIDs.length === 0) {
          console.log("TaskModal: Project has no members in teamRoles.");
          setLoadingMembers(false);
          return;
        }
        const memberPromises = memberUIDs.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              return { uid: userDoc.id, ...userDoc.data() };
            } else {
              console.warn(`TaskModal: User doc not found for UID: ${uid}`);
              return null;
            }
          } catch (err) {
            console.error(`TaskModal: Error fetching user doc ${uid}:`, err);
            return null;
          }
        });
        const members = await Promise.all(memberPromises);
        setTeamMembers(members.filter(Boolean));
        setLoadingMembers(false);
      } catch (err) {
        console.error("TaskModal: Critical error fetching team members.", err);
        setLoadingMembers(false);
      }
    };
    fetchTeamMembers();
  }, [projectId]);

  // 2. Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'storyPoints' ? Number(value) : value
    }));
  };

  // 3. Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const assigneeEmail = teamMembers.find(m => m.uid === formData.assigneeId)?.email || '';
    onSave({
      id: task?.id,
      ...formData,
      assigneeEmail: assigneeEmail
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h2 className="modal-title">{isEditMode ? formData.title : 'Create New Task'}</h2>
        {isEditMode && (
          <span className="modal-task-id">#{task.id?.substring(0, 5)}</span>
        )}
      </div>

      <div className="modal-tabs">
        <button 
          className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        {isEditMode && (
          <button 
            className={`modal-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        )}
      </div>

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit} className="modal-body">
          {/* --- Form content remains the same --- */}
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="5"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add a more detailed description..."
            ></textarea>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select id="type" name="type" value={formData.type} onChange={handleChange}>
                <option value="Story">Story</option>
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="assigneeId">Assignee</label>
              <select 
                id="assigneeId" 
                name="assigneeId" 
                value={formData.assigneeId} 
                onChange={handleChange}
                disabled={loadingMembers}
              >
                <option value="">
                  {loadingMembers ? "Loading..." : "Unassigned"}
                </option>
                {teamMembers.map(member => (
                  <option key={member.uid} value={member.uid}>
                    {member.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="storyPoints">Story Points</label>
              <input
                id="storyPoints"
                name="storyPoints"
                type="number"
                min="0"
                value={formData.storyPoints}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="modal-actions-split">
            {isEditMode && (
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={() => onDelete(task.id)}
              >
                Delete Task
              </button>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditMode ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'activity' && isEditMode && (
        <div className="modal-body">
          <CommentFeed task={task} sprint={sprint} />
        </div>
      )}
    </Modal>
  );
};

export default TaskModal;