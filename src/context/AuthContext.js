import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        setProfileDoc(snap.exists() ? snap.data() : null);
      } else {
        setProfileDoc(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signOutAsync = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profileDoc, loading, signOutAsync }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
