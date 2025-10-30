import React from 'react';
import Header from './Header'; // Renamed from Sidebar
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Header /> {/* Renamed from Sidebar */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;