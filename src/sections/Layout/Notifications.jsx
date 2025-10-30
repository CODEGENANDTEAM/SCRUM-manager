import React, { useState, useEffect } from 'react';
import { useAuth } from '../../data/hooks/useAuth';
import { db } from '../../database/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const Notifications = ({ setUnreadCount }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Listen for notifications in real-time
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef, 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        // --- Success ---
        const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notifsData);

        const unread = notifsData.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        setLoading(false);
      },
      (err) => {
        // --- THIS IS THE NEW ERROR HANDLER ---
        console.error("Error fetching notifications (Check your Firestore Indexes):", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, setUnreadCount]);

  // 3. Handle marking a notification as read
  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      const notifRef = doc(db, 'notifications', notif.id);
      await updateDoc(notifRef, {
        isRead: true
      });
    }
    navigate(notif.link);
  };

  return (
    <div className="notifications-dropdown">
      <div className="notifications-header">
        <h4>Notifications</h4>
      </div>
      <div className="notifications-list">
        {loading && <div className="notification-item">Loading...</div>}
        {!loading && notifications.length === 0 && (
          <div className="notification-item empty">You're all caught up!</div>
        )}
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
            onClick={() => handleNotifClick(notif)}
          >
            <div className="notification-message">{notif.message}</div>
            <div className="notification-date">
              {new Date(notif.createdAt?.toDate()).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;