import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, Users } from 'lucide-react';
import { useAuth } from '../../data/hooks/useAuth';
import { db } from '../../database/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Timeline.css';

const Timeline = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [expandedSprints, setExpandedSprints] = useState(new Set());
  const [hoveredTask, setHoveredTask] = useState(null);
  const navigate = useNavigate();

  // 1. Fetch user's projects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where('teamUids', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // 2. Fetch sprints from those projects
  useEffect(() => {
    if (projects.length === 0) return;
    const projectIds = projects.map(p => p.id);
    const q = query(collection(db, 'sprints'), where('projectId', 'in', projectIds));
    const unsub = onSnapshot(q, (snapshot) => {
      const sprintData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSprints(sprintData);
      setExpandedSprints(new Set(sprintData.map(s => s.id)));
    });
    return () => unsub();
  }, [projects]);

  // 3. Fetch tasks from those sprints
  useEffect(() => {
    if (sprints.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const sprintIds = sprints.map(s => s.id);
    const q = query(collection(db, 'tasks'), where('sprintId', 'in', sprintIds));
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [sprints]);

  // 4. Transform and process data
  const sprintData = useMemo(() => {
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];
    
    return sprints.map((sprint, idx) => {
      if (!sprint.startDate || !sprint.endDate) return null;
      
      const sprintStartDate = sprint.startDate.toDate ? sprint.startDate.toDate() : new Date(sprint.startDate);
      const sprintEndDate = sprint.endDate.toDate ? sprint.endDate.toDate() : new Date(sprint.endDate);

      if (sprintEndDate < sprintStartDate) return null;

      const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
      const completedTasks = sprintTasks.filter(t => t.status === 'Done');
      const progress = sprintTasks.length === 0 ? 0 : (completedTasks.length / sprintTasks.length) * 100;

      const processedTasks = sprintTasks.map(task => {
        let taskStart, taskEnd;
        let taskType = (task.type || 'story').toLowerCase();

        if (task.createdAt) {
          taskStart = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
        } else {
          taskStart = sprintStartDate;
        }

        if (task.status === 'Done' && task.completedAt) {
          taskEnd = task.completedAt.toDate ? task.completedAt.toDate() : new Date(task.completedAt);
        } else {
          taskEnd = sprintEndDate;
        }

        if (taskEnd < taskStart) {
          taskEnd = new Date(taskStart);
          taskEnd.setDate(taskEnd.getDate() + 1);
        }
        
        if (taskStart.getTime() === taskEnd.getTime()) {
          taskEnd = new Date(taskEnd);
          taskEnd.setDate(taskEnd.getDate() + 1);
        }

        let priority = 'medium';
        if (taskType === 'bug') priority = 'high';
        else if (taskType === 'task') priority = 'medium';
        else priority = 'low';

        return {
          id: task.id,
          name: task.title,
          startDate: taskStart,
          endDate: taskEnd,
          progress: task.status === 'Done' ? 100 : (task.status === 'InProgress' ? 30 : 0),
          assignee: task.assignedTo || 'Unassigned',
          priority: priority,
          type: taskType,
          status: task.status
        };
      });

      return {
        id: sprint.id,
        name: sprint.name,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        progress: Math.round(progress),
        color: colors[idx % colors.length],
        tasks: processedTasks
      };
    }).filter(Boolean);
  }, [sprints, tasks]);

  const toggleSprint = (sprintId) => {
    const newExpanded = new Set(expandedSprints);
    if (newExpanded.has(sprintId)) {
      newExpanded.delete(sprintId);
    } else {
      newExpanded.add(sprintId);
    }
    setExpandedSprints(newExpanded);
  };

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (sprintData.length === 0) {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);
      return { minDate: today, maxDate: future, totalDays: 30 };
    }

    const allDates = sprintData.flatMap(s => [
      s.startDate, 
      s.endDate, 
      ...s.tasks.flatMap(t => [t.startDate, t.endDate])
    ]);
    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    const days = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
    
    return { minDate: min, maxDate: max, totalDays: days };
  }, [sprintData]);

  const getDatePosition = (date) => {
    const days = Math.ceil((date - minDate) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const getBarWidth = (startDate, endDate) => {
    return getDatePosition(endDate) - getDatePosition(startDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low'
    };
    return colors[priority] || colors.medium;
  };

  const generateTimelineHeader = () => {
    const headers = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      if (viewMode === 'week') {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        headers.push({
          label: `Week ${Math.ceil(current.getDate() / 7)}`,
          start: new Date(current),
          end: weekEnd > maxDate ? new Date(maxDate) : weekEnd
        });
        current.setDate(current.getDate() + 7);
      } else {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        headers.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start: new Date(current),
          end: monthEnd > maxDate ? new Date(maxDate) : monthEnd
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    return headers;
  };

  const timelineHeaders = useMemo(() => generateTimelineHeader(), [viewMode, minDate, maxDate]);

  const handleTaskClick = (task) => {
    const sprint = sprintData.find(s => s.tasks.some(t => t.id === task.id));
    if (sprint) {
      navigate(`/sprint/${sprint.id}`);
    }
  };

  if (loading) {
    return (
      <div className="timeline-container loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (sprintData.length === 0) {
    return (
      <div className="timeline-container empty-container">
        <div className="empty-content">
          <Calendar className="empty-icon" />
          <h2 className="empty-title">No Sprints Found</h2>
          <p className="empty-text">Create sprints with dates to see them on the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-wrapper">
        {/* Header */}
        <div className="timeline-header">
          <div className="header-top">
            <div>
              <h1 className="page-title">Project Timeline</h1>
              <p className="date-range">
                <Calendar className="date-icon" />
                {formatDate(minDate)} - {formatDate(maxDate)}
              </p>
            </div>
            
            {/* Controls */}
            <div className="controls">
              <div className="view-mode-toggle">
                <button
                  onClick={() => setViewMode('week')}
                  className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
                >
                  Month
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Total Sprints</p>
                  <p className="stat-value">{sprintData.length}</p>
                </div>
                <div className="stat-icon blue-icon">
                  <Calendar className="icon" />
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Total Tasks</p>
                  <p className="stat-value">
                    {sprintData.reduce((acc, s) => acc + s.tasks.length, 0)}
                  </p>
                </div>
                <div className="stat-icon purple-icon">
                  <Clock className="icon" />
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Avg Progress</p>
                  <p className="stat-value">
                    {sprintData.length > 0 
                      ? Math.round(sprintData.reduce((acc, s) => acc + s.progress, 0) / sprintData.length)
                      : 0}%
                  </p>
                </div>
                <div className="stat-icon cyan-icon">
                  <Users className="icon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="gantt-chart">
          {/* Timeline Header */}
          <div className="gantt-header">
            <div className="gantt-col-3 gantt-cell">
              <h3 className="gantt-header-title">Task Name</h3>
            </div>
            <div className="gantt-col-9">
              <div className="timeline-header-row">
                {timelineHeaders.map((header, idx) => {
                  const width = getBarWidth(header.start, header.end);
                  return (
                    <div
                      key={idx}
                      className="timeline-header-cell"
                      style={{ width: `${width}%` }}
                    >
                      <span className="timeline-header-label">{header.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Body */}
          <div className="gantt-body">
            {sprintData.map((sprint) => (
              <div key={sprint.id}>
                {/* Sprint Row */}
                <div className="gantt-row">
                  <div className="gantt-col-3 gantt-cell">
                    <div className="sprint-cell">
                      <button
                        onClick={() => toggleSprint(sprint.id)}
                        className="expand-btn"
                      >
                        {expandedSprints.has(sprint.id) ? (
                          <ChevronDown className="expand-icon" />
                        ) : (
                          <ChevronRight className="expand-icon" />
                        )}
                      </button>
                      <div className="sprint-info">
                        <p className="sprint-name">{sprint.name}</p>
                        <p className="sprint-task-count">{sprint.tasks.length} tasks</p>
                      </div>
                    </div>
                  </div>
                  <div className="gantt-col-9 gantt-cell">
                    <div className="bar-container">
                      <div
                        className="sprint-bar"
                        style={{
                          left: `${getDatePosition(sprint.startDate)}%`,
                          width: `${getBarWidth(sprint.startDate, sprint.endDate)}%`,
                          backgroundColor: sprint.color,
                        }}
                        onClick={() => navigate(`/sprint/${sprint.id}`)}
                      >
                        <div
                          className="progress-bar"
                          style={{ width: `${sprint.progress}%` }}
                        />
                        <span className="progress-label">
                          {sprint.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Rows */}
                {expandedSprints.has(sprint.id) && sprint.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="gantt-row task-row"
                    onMouseEnter={() => setHoveredTask(task.id)}
                    onMouseLeave={() => setHoveredTask(null)}
                  >
                    <div className="gantt-col-3 gantt-cell task-cell">
                      <div className="task-info">
                        <p className="task-name">{task.name}</p>
                        <span className={`task-type-badge ${getPriorityColor(task.priority)}`}>
                          {task.type}
                        </span>
                      </div>
                      <p className="task-assignee">{task.assignee}</p>
                    </div>
                    <div className="gantt-col-9 gantt-cell">
                      <div className="task-bar-container">
                        <div
                          className={`task-bar ${hoveredTask === task.id ? 'hovered' : ''}`}
                          style={{
                            left: `${getDatePosition(task.startDate)}%`,
                            width: `${getBarWidth(task.startDate, task.endDate)}%`,
                            backgroundColor: sprint.color,
                          }}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div
                            className="task-progress"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        
                        {/* Tooltip */}
                        {hoveredTask === task.id && (
                          <div
                            className="task-tooltip"
                            style={{
                              left: `${getDatePosition(task.startDate) + getBarWidth(task.startDate, task.endDate) / 2}%`,
                            }}
                          >
                            <p className="tooltip-title">{task.name}</p>
                            <p className="tooltip-text">{formatDate(task.startDate)} - {formatDate(task.endDate)}</p>
                            <p className="tooltip-text">Progress: {task.progress}%</p>
                            <p className="tooltip-text">Status: {task.status}</p>
                            <div className="tooltip-arrow" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <h3 className="legend-title">Legend</h3>
          <div className="legend-items">
            {sprintData.map((sprint) => (
              <div key={sprint.id} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: sprint.color }}></div>
                <span className="legend-label">{sprint.name}</span>
              </div>
            ))}
            <div className="legend-item">
              <div className="legend-color progress-indicator"></div>
              <span className="legend-label">Progress Indicator</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;