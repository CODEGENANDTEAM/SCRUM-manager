SCRUM Manager

A real-time, full-stack Scrum and project management tool built with React, Vite, and Firebase. Designed for Agile teams to manage tasks, sprints, and projects with real-time collaboration.

Key Features

Authentication & Roles: Full user login, sign-up, and admin roles.

"My Work" Dashboard: Personal dashboard showing all tasks assigned to the logged-in user.

Project Management: Create, edit, and delete projects.

Member Management: Add/remove team members by email.

Sprint Planning: Create sprints with goals, dates, and velocity targets.

Backlog & Board: Product Backlog and Kanban-style board for task management.

Task Management: Create, edit, and assign tasks; set story points.

Collaboration: Real-time comments, mentions, and notifications.

Reporting: Velocity tracking, Burndown Chart, and Gantt chart.

Tech Stack

Frontend: React (Vite)

Backend: Firebase (Firestore, Firebase Authentication)

Drag & Drop: @hello-pangea/dnd

Charts: recharts, gantt-task-react

Styling: Plain CSS with CSS Variables

Installation & Setup

Clone the repo:

git clone https://github.com/CODEGENANDTEAM/SCRUM-manager.git
cd SCRUM-manager


Install dependencies:

npm install --legacy-peer-deps
npm install react-is --legacy-peer-deps


Create a Firebase project:

Enable Authentication (Email/Password) & Firestore Database.

Update src/database/firebase.js with your Firebase config.

Run the app:

npm run dev

Firebase Configuration
Firestore Rules:

Update Firestore rules for security and permissions (see full rule set above).

Firestore Indexes:

Projects Index: teamUids

Dashboard Index: assigneeId + status

Notifications Index: userId + createdAt

Make sure indexes are enabled before running the app.
