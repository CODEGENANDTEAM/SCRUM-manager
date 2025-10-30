import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (authUser) {
        // 2. If user is logged in, listen for their profile doc in Firestore
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data());
          } else {
            setUserProfile(null); // Profile doesn't exist?
          }
          setLoading(false);
        });
        
        return () => unsubscribeProfile(); // Cleanup profile listener
      } else {
        // No authUser, so clear profile and set loading to false
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  const value = {
    user,         // The raw auth user (from Firebase Auth)
    userProfile,  // The user data from Firestore (with role)
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};