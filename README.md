SCRUM Manager
A complete, full-stack, real-time Scrum and project management tool built with React, Vite, and Firebase.

This is an internal-facing application designed to help teams manage projects, tasks, and sprints using Agile principles. It features real-time data syncing, user authentication, and collaborative tools.

✨ Key Features
Authentication & Roles: Full user login, sign-up, and a super-admin role (for chinmaygaikar09@gmail.com) with full access.

"My Work" Dashboard: A personal dashboard that shows all tasks assigned to the currently logged-in user, sorted by status.

Project Management: A dedicated projects page to create, edit, and delete projects.

Member Management: Add or remove team members to projects by their email address.

Sprint Planning: A "Sprints" page to create sprints with goals, start/end dates, and velocity targets. Past dates are disabled for planning.

Backlog & Board:

Product Backlog: A two-column page to plan sprints by dragging tasks from the main Product Backlog into a selected Sprint Backlog.

Kanban Board: A drag-and-drop board for each sprint with "To Do", "In Progress", "Review", and "Done" columns.

Task Management:

Create, edit, and delete tasks (Story, Bug, Task).

Assign tasks to team members.

Set story points.

Collaboration & Notifications:

Real-time Comments: A full activity feed with comments on each task.

@Mentions: Mention teammates in comments (e.g., @user@example.com) to send them a notification.

Notification Bell: A real-time notification bell in the header that shows a count of unread mentions.

Reporting & Timeline:

Velocity Tracking: Sprint cards show completed story points vs. total (e.g., "8/16 SP").

Burndown Chart: A live burndown chart on each sprint board.

Gantt Chart: A "Timeline" page showing all sprints and tasks in a modern Gantt chart.

🛠️ Tech Stack
Frontend: React (Vite)

Database: Firestore (Firebase)

Authentication: Firebase Authentication

Routing: react-router-dom

Drag & Drop: @hello-pangea/dnd

Charts:

recharts (for Burndown Chart)

gantt-task-react (for Gantt Timeline)

Styling: Plain CSS with CSS Variables

📦 Installation & Setup
Clone the repository:

Bash

git clone https://github.com/CODEGENANDTEAM/SCRUM-manager.git
cd SCRUM-manager
Install dependencies: This project uses libraries that have peer dependency conflicts with React 19. Use the --legacy-peer-deps flag to install.

Bash

npm install --legacy-peer-deps
Install react-is (if needed): recharts requires this package.

Bash

npm install react-is --legacy-peer-deps
Create a Firebase Project:

Go to the Firebase Console and create a new project.

Enable Authentication (Email/Password).

Enable Firestore Database.

Update Firebase Config: Open src/database/firebase.js and replace the firebaseConfig object with your project's keys.

Run the app:

Bash

npm run dev
🔥 Firebase Configuration (Critical)
For the app to work, you must configure your Firestore database correctly.

1. Firestore Rules
Go to Firestore Database > Rules and paste in the following ruleset. This is required for permissions.

JavaScript

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users
    match /users/{userId} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid == userId;
    }

    // Projects
    match /projects/{projectId} {
      allow list: if request.auth.uid != null;
      allow get: if request.auth.uid in resource.data.teamUids;
      allow create: if request.auth.uid != null;
      allow update, delete: if resource.data.teamRoles[request.auth.uid] == 'owner' ||
                              (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin');
    }

    // Tasks
    match /tasks/{taskId} {
      function isSuperAdmin() {
        return exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin';
      }
      function isProjectMember() {
        return exists(/databases/$(database)/documents/projects/$(resource.data.projectId)) &&
               request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.teamUids;
      }
      
      allow read: if isProjectMember() || resource.data.assigneeId == request.auth.uid || isSuperAdmin();
      allow create, update, delete: if isProjectMember() || isSuperAdmin();
          
      // Comments
      match /comments/{commentId} {
        allow read, create: if isProjectMember() || resource.data.assigneeId == request.auth.uid || isSuperAdmin();
        allow delete: if request.auth.uid == resource.data.authorId || isSuperAdmin();
      }
    }

    // Sprints
    match /sprints/{sprintId} {
      function isSuperAdmin() {
        return exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin';
      }
      allow read, create, update, delete: if 
          (exists(/databases/$(database)/documents/projects/$(request.resource.data.projectId)) &&
           request.auth.uid in get(/databases/$(database)/documents/projects/$(request.resource.data.projectId)).data.teamUids)
          || isSuperAdmin();
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow create: if request.auth.uid != null;
      allow read, update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
2. Firestore Indexes
Go to Firestore Database > Indexes. You must create 3 indexes for the queries to work.

Projects Index (Single-field):

Collection: projects

Field: teamUids

Scope: Arrays (Enabled)

"My Work" Dashboard Index (Composite):

Collection: tasks

Field 1: assigneeId (Ascending)

Field 2: status (Ascending)

Notifications Index (Composite):

Collection: notifications

Field 1: userId (Ascending)

Field 2: createdAt (Descending)

Wait for all indexes to be "Enabled" before running the app.
