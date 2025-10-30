import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../database/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from '../../components/TaskCard/TaskCard';
import TaskModal from '../SprintBoard/TaskModal'; // Re-using the task modal
import './ProjectBacklog.css';

const ProjectBacklog = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]); // All tasks for the project
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modal, setModal] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // 1. Fetch Project Details
  useEffect(() => {
    const projectRef = doc(db, 'projects', projectId);
    const unsub = onSnapshot(projectRef, (doc) => {
      if (doc.exists()) {
        setProject({ id: doc.id, ...doc.data() });
      } else {
        console.error("Project not found!");
      }
    });
    return () => unsub();
  }, [projectId]);

  // 2. Fetch Sprints for this Project
  useEffect(() => {
    const sprintsRef = collection(db, 'sprints');
    const q = query(sprintsRef, where('projectId', '==', projectId));
    const unsub = onSnapshot(q, (snapshot) => {
      const sprintsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSprints(sprintsData);
      // Automatically select the first "upcoming" sprint
      const firstUpcoming = sprintsData.find(s => s.status === 'Upcoming');
      if (firstUpcoming) {
        setSelectedSprintId(firstUpcoming.id);
      } else if (sprintsData.length > 0) {
        setSelectedSprintId(sprintsData[0].id);
      }
    });
    return () => unsub();
  }, [projectId]);

  // 3. Fetch all Tasks for this Project
  useEffect(() => {
    setLoading(true);
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId));
    const unsub = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  // 4. Filter tasks based on selected sprint (using useMemo for efficiency)
  const productBacklogTasks = useMemo(() => {
    return tasks
      .filter(task => !task.sprintId) // No sprintId
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks]);

  const sprintBacklogTasks = useMemo(() => {
    if (!selectedSprintId) return [];
    return tasks
      .filter(task => task.sprintId === selectedSprintId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks, selectedSprintId]);

  // 5. Handle Drag-and-Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return; // Dropped outside a list
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return; // Dropped in the same place
    }

    const taskRef = doc(db, 'tasks', draggableId);

    // --- MOVING A TASK ---
    if (source.droppableId !== destination.droppableId) {
      // Task is moving between lists
      const newSprintId = destination.droppableId === 'sprint-backlog' ? selectedSprintId : null;
      
      // Optimistic UI update
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === draggableId ? { ...task, sprintId: newSprintId } : task
      ));

      // Update Firebase
      await updateDoc(taskRef, {
        sprintId: newSprintId
      });
    } else {
      // Task is re-ordering within the same list
      // TODO: Implement re-ordering logic by updating the 'order' field
    }
  };

  // 6. Handle Task Modal (Create, Edit, Save, Delete)
  const openModal = (type, task = null) => {
    setSelectedTask(task);
    setModal(type);
  };
  const closeModal = () => {
    setModal(null);
    setSelectedTask(null);
  };
  const handleSaveTask = async (taskData) => {
    const { id, ...dataForDoc } = taskData;
    if (id) {
      await updateDoc(doc(db, 'tasks', id), dataForDoc);
    } else {
      await addDoc(collection(db, 'tasks'), {
        ...dataForDoc,
        sprintId: null, // New tasks always start in the Product Backlog
        projectId: projectId,
        status: 'ToDo',
        createdAt: serverTimestamp(),
        order: productBacklogTasks.length
      });
    }
    closeModal();
  };
  // ... (handleDeleteTask from SprintBoard.jsx can be copied here if needed)

  // --- RENDER ---
  if (loading || !project) {
    return <div className="page-container">Loading Project Backlog...</div>;
  }

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  return (
    <>
      {modal && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={() => {}} // Add delete logic
        />
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="page-container backlog-page">
          <div className="backlog-header">
            <h1>{project.name} Backlog</h1>
            <button className="btn btn-primary" onClick={() => openModal('create')}>
              + New Task
            </button>
          </div>

          <div className="backlog-grid">
            {/* --- PRODUCT BACKLOG COLUMN --- */}
            <div className="backlog-column">
              <div className="backlog-column-header">
                <h3>Product Backlog</h3>
                <span>{productBacklogTasks.length} items</span>
              </div>
              <Droppable droppableId="product-backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {productBacklogTasks.map((task, index) => (
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
                    {productBacklogTasks.length === 0 && (
                      <div className="empty-list-placeholder">Backlog is empty.</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* --- SPRINT BACKLOG COLUMN --- */}
            <div className="backlog-column">
              <div className="backlog-column-header">
                <select 
                  value={selectedSprintId} 
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="sprint-select"
                >
                  <option value="">Select a Sprint</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status})
                    </option>
                  ))}
                </select>
                <span>{sprintBacklogTasks.length} items</span>
              </div>
              <Droppable droppableId="sprint-backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {sprintBacklogTasks.map((task, index) => (
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
                    {selectedSprintId && sprintBacklogTasks.length === 0 && (
                      <div className="empty-list-placeholder">Drag tasks here.</div>
                    )}
                    {!selectedSprintId && (
                      <div className="empty-list-placeholder">Select a sprint.</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      </DragDropContext>
    </>
  );
};

export default ProjectBacklog;