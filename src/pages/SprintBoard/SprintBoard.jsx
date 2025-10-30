import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../database/firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from '../../components/TaskCard/TaskCard';
import TaskModal from './TaskModal';
import BurndownChart from '../../components/BurndownChart/BurndownChart';
import './SprintBoard.css';

// --- Reusable Modal Component (for ConfirmModal) ---
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

// Define the columns
const columns = [
  { id: 'ToDo', title: 'To Do' },
  { id: 'InProgress', title: 'In Progress' },
  { id: 'Review', title: 'Review' },
  { id: 'Done', title: 'Done' }
];

const SprintBoard = () => {
  const { sprintId } = useParams();
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modal, setModal] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // --- NEW: State for Confirm Modal ---
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // 1. Fetch the sprint document
  useEffect(() => {
    const sprintRef = doc(db, 'sprints', sprintId);
    const unsubscribe = onSnapshot(sprintRef, (doc) => {
      if (doc.exists()) {
        setSprint({ id: doc.id, ...doc.data() });
      } else {
        console.error("No such sprint found!");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sprintId]);

  // 2. Fetch all tasks for this sprint
  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('sprintId', '==', sprintId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sprintTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      sprintTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      setTasks(sprintTasks);
    });

    return () => unsubscribe();
  }, [sprintId]);

  // 3. Handle Drag-and-Drop
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    
    const task = tasks.find(t => t.id === taskId);
    const oldStatus = task.status;

    let updateData = { status: newStatus };

    if (newStatus === 'Done' && oldStatus !== 'Done') {
      updateData.completedAt = serverTimestamp();
    }
    if (newStatus !== 'Done' && oldStatus === 'Done') {
      updateData.completedAt = null;
    }

    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, ...updateData, completedAt: newStatus === 'Done' ? new Date() : null } : t
    );
    setTasks(updatedTasks);

    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updateData);
    } catch (err) {
      console.error("Error updating task status:", err);
      setTasks(tasks);
    }
  };

  // 4. Handle Task Modal
  const openModal = (type, task = null) => {
    setSelectedTask(task);
    setModal(type);
  };
  const closeModal = () => {
    setModal(null);
    setSelectedTask(null);
  };
  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      const { id, ...dataToUpdate } = taskData;
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, dataToUpdate);
    } else {
      const { id, ...dataForDoc } = taskData; 
      await addDoc(collection(db, 'tasks'), {
        ...dataForDoc,
        sprintId: sprintId,
        projectId: sprint.projectId,
        status: 'ToDo',
        createdAt: serverTimestamp(),
        order: tasks.filter(t => t.status === 'ToDo').length
      });
    }
    closeModal();
  };

  // --- UPDATED: Delete Task Logic ---
  const requestDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setTaskToDelete(task);
    setConfirmModalOpen(true);
    closeModal(); // Close the edit modal
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      setConfirmModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error("Error deleting task:", err);
      setConfirmModalOpen(false);
    }
  };


  // --- Render ---
  if (loading || !sprint) {
    return <div className="page-container">Loading Sprint...</div>;
  }
  
  const getTasksForColumn = (status) => {
    return tasks.filter(task => task.status === status);
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <>
      {modal && (
        <TaskModal
          task={selectedTask}
          projectId={sprint.projectId}
          sprint={sprint}
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={requestDeleteTask} // <-- Updated prop
        />
      )}

      {/* --- NEW: Confirm Modal for Deleting Tasks --- */}
      {confirmModalOpen && taskToDelete && (
        <ConfirmModal
          title={`Delete Task: ${taskToDelete.title}`}
          message="Are you sure you want to delete this task?"
          onConfirm={confirmDeleteTask}
          onCancel={() => setConfirmModalOpen(false)}
        />
      )}

      <div className="page-container sprint-board-page">
        <div className="sprint-header">
          <h1>Sprint: {sprint.name}</h1>
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            + New Task
          </button>
        </div>

        <div className="sprint-details-container">
          <div className="sprint-goal">
            <strong>Sprint Goal:</strong>
            <p>{sprint.goal || 'No goal set for this sprint.'}</p>
          </div>
          <div className="sprint-meta">
            <span className="sprint-meta-item">
              <strong>Status:</strong> <span className={`status-badge status-${sprint.status}`}>{sprint.status}</span>
            </span>
            <span className="sprint-meta-item">
              <strong>Dates:</strong> {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
            </span>
          </div>
        </div>
        
        <BurndownChart tasks={tasks} sprint={sprint} />

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {columns.map((col) => (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    <h3 className="kanban-column-title">{col.title} ({getTasksForColumn(col.id).length})</h3>
                    <div className="kanban-column-tasks">
                      {getTasksForColumn(col.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="task-card-wrapper"
                            >
                              <TaskCard 
                                task={task} 
                                onClick={() => openModal('edit', task)} 
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </>
  );
};

export default SprintBoard;