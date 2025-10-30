import React, { useState, useEffect } from 'react';
import { useAuth } from '../../data/hooks/useAuth';
import { db } from '../../database/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import TaskCard from '../../components/TaskCard/TaskCard';
import './MyWork.css'; // Using its own CSS file

const MyWork = () => {
  const { user, userProfile } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Query for tasks assigned to the current user that are not "Done"
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef, 
      where('assigneeId', '==', user.uid),
      where('status', '!=', 'Done')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyTasks(tasks);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
      // This error likely means you need to create a Firestore Index
    });

    return () => unsubscribe();
  }, [user]);

  // Group tasks by their status
  const tasksToDo = myTasks.filter(t => t.status === 'ToDo');
  const tasksInProgress = myTasks.filter(t => t.status === 'InProgress');
  const tasksInReview = myTasks.filter(t => t.status === 'Review');

  return (
    <div className="page-container my-work-dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {userProfile?.email.split('@')[0]}</h1>
        <p>Here's what's on your plate today.</p>
      </div>

      <div className="my-work-grid">
        {/* --- To Do Column --- */}
        <div className="work-column">
          <h3 className="work-column-title">To Do ({tasksToDo.length})</h3>
          <div className="work-column-tasks">
            {loading && <p>Loading...</p>}
            {tasksToDo.length === 0 && !loading && <p className="empty-tasks">No tasks to do.</p>}
            {tasksToDo.map(task => (
              <TaskCard 
                key={task.id} 
                task={task}
                onClick={() => navigate(`/sprint/${task.sprintId}`)}
              />
            ))}
          </div>
        </div>

        {/* --- In Progress Column --- */}
        <div className="work-column">
          <h3 className="work-column-title">In Progress ({tasksInProgress.length})</h3>
          <div className="work-column-tasks">
            {loading && <p>Loading...</p>}
            {tasksInProgress.length === 0 && !loading && <p className="empty-tasks">Nothing in progress.</p>}
            {tasksInProgress.map(task => (
              <TaskCard 
                key={task.id} 
                task={task}
                onClick={() => navigate(`/sprint/${task.sprintId}`)}
              />
            ))}
          </div>
        </div>

        {/* --- In Review Column --- */}
        <div className="work-column">
          <h3 className="work-column-title">In Review ({tasksInReview.length})</h3>
          <div className="work-column-tasks">
            {loading && <p>Loading...</p>}
            {tasksInReview.length === 0 && !loading && <p className="empty-tasks">Nothing in review.</p>}
            {tasksInReview.map(task => (
              <TaskCard 
                key={task.id} 
                task={task}
                onClick={() => navigate(`/sprint/${task.sprintId}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyWork;