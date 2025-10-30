import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../database/firebase';
import { useAuth } from '../../data/hooks/useAuth';
import Notifications from './Notifications'; // <-- IMPORT
import './Header.css';

// Custom hook to detect clicks outside an element
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
};

const Header = () => {
  const { user } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false); // <-- NEW
  const [unreadCount, setUnreadCount] = useState(0); // <-- NEW

  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const navigate = useNavigate();

  useOutsideClick(userDropdownRef, () => setUserDropdownOpen(false));
  useOutsideClick(notifDropdownRef, () => setNotifDropdownOpen(false));

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const toggleNotifDropdown = () => {
    setNotifDropdownOpen(!notifDropdownOpen);
    if (userDropdownOpen) setUserDropdownOpen(false);
  };
  
  const toggleUserDropdown = () => {
    setUserDropdownOpen(!userDropdownOpen);
    if (notifDropdownOpen) setNotifDropdownOpen(false);
  };

  return (
    <header className="header">
      <nav className="header-nav">
        <Link to="/dashboard" className="header-logo">
          Scrum
        </Link>
        <div className="header-links">
          <NavLink to="/dashboard" className="header-link">
            Dashboard
          </NavLink>
          <NavLink to="/projects" className="header-link">
            Projects
          </NavLink>
          <NavLink to="/mywork" className="header-link">
            My Work
          </NavLink>
          <NavLink to="/sprints" className="header-link">
            Sprints
          </NavLink>
          <NavLink to="/timeline" className="header-link">
            Timeline
          </NavLink>

          
         
          
        </div>

        {/* --- UPDATED: User Menu Wrapper --- */}
        <div className="header-user-menu">
        
          {/* --- NEW: Notifications Bell --- */}
          <div className="header-user" ref={notifDropdownRef}>
            <button className="user-menu-button icon" onClick={toggleNotifDropdown}>
              <svg xmlns="http://www.w.3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.017 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            {notifDropdownOpen && (
              <Notifications user={user} setUnreadCount={setUnreadCount} />
            )}
          </div>
          
          {/* --- User Profile Dropdown --- */}
          <div className="header-user" ref={userDropdownRef}>
            <button 
              className="user-menu-button" 
              onClick={toggleUserDropdown}
            >
              {user?.email}
              <span className="chevron-down">▼</span>
            </button>
            {userDropdownOpen && (
              <div className="user-dropdown-menu">
                <button onClick={handleLogout} className="dropdown-item">
                  <svg xmlns="http://www.w.3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
          
        </div>
      </nav>
    </header>
  );
};

export default Header;