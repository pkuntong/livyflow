import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    // Clear JWT token from localStorage
    localStorage.removeItem('authToken');
    return signOut(auth);
  }

  // Function to set JWT token (called after successful Firebase auth)
  const setAuthToken = (token) => {
    localStorage.setItem('authToken', token);
  };

  // Function to get JWT token
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // If user is authenticated, get JWT token from your backend
      if (user) {
        try {
          // Get Firebase ID token
          const idToken = await user.getIdToken();
          
          // In a real app, you'd exchange this for a JWT from your backend
          // For now, we'll use the Firebase ID token as the auth token
          setAuthToken(idToken);
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
      } else {
        // Clear token when user logs out
        localStorage.removeItem('authToken');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user: currentUser,
    currentUser,
    signup,
    login,
    logout,
    setAuthToken,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 