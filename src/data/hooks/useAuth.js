import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth() must be used inside an AuthProvider');
  }
  // Now provides auth user AND firestore profile
  return context;
};