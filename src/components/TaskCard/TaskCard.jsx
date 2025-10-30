import React from 'react';
import './TaskCard.css';

// Helper to get initials
const getInitials = (email) => {
  return email ? email.substring(0, 2).toUpperCase() : '?';
};

// Helper to get a simple icon for task type
const TaskTypeIcon = ({ type }) => {
  if (type === 'Bug') {
    return <span className="task-icon bug">🐞</span>; // Bug
  }
  if (type === 'Task') {
    return <span className="task-icon task">✓</span>; // Check
  }
  // Default to Story
  return <span className="task-icon story">📘</span>; // Book
};

const TaskCard = ({ task, onClick }) => {
  const cardClassName = `task-card type-${(task.type || 'story').toLowerCase()}`;

  return (
    <div className={cardClassName} onClick={onClick}>
      <div className="task-card-header">
        <TaskTypeIcon type={task.type} />
        <span className="task-card-id">#{task.id?.substring(0, 5) || 'NEW'}</span>
      </div>
      <h4 className="task-card-title">{task.title}</h4>
      <div className="task-card-footer">
        <div className="task-card-meta">
          {task.storyPoints > 0 && (
            <span className="task-card-points">{task.storyPoints} SP</span>
          )}
        </div>
        {task.assigneeEmail && (
          <span className="task-card-assignee" title={task.assigneeEmail}>
            {getInitials(task.assigneeEmail)}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;