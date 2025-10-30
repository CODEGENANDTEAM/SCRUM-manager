import React, { useState } from 'react';
import './Login.css';
import { auth, db } from '../../database/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Import firestore functions

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const userEmail = email.toLowerCase();

    try {
      if (isLogin) {
        // --- SIGN IN ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- SIGN UP ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- NEW: Assign Role and Create User Profile ---
        const userRole = userEmail === 'chinmaygaikar09@gmail.com' 
          ? 'super-admin' 
          : 'member';

        // Create a document in 'users' collection with the user's UID as the doc ID
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: userEmail,
          role: userRole,
          createdAt: serverTimestamp()
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Helper to make Firebase errors user-friendly
  const getFirebaseErrorMessage = (err) => {
    switch (err.code) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Scrum</h1>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="toggle-auth-btn"
        >
          {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;