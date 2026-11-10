import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, MeResponse } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  adminSetupNeeded: boolean;
  loading: boolean;
  refreshMe: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminSetupNeeded, setAdminSetupNeeded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken(false);
  }, []);

  const refreshMe = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setIsAdmin(false);
      setAdminSetupNeeded(false);
      return;
    }

    try {
      const resp = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resp.ok) {
        const data: MeResponse = await resp.json();
        setIsAdmin(Boolean(data.isAdmin));
        setAdminSetupNeeded(Boolean(data.adminSetupNeeded));
      } else {
        setIsAdmin(false);
        setAdminSetupNeeded(false);
      }
    } catch (e) {
      console.warn('Error fetching /api/me:', e);
      setIsAdmin(false);
      setAdminSetupNeeded(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Clean up previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!currentUser) {
        setProfile(null);
        setIsAdmin(false);
        setAdminSetupNeeded(false);
        setLoading(false);
        return;
      }

      try {
        // Listen to user's profile document in Firestore
        const profileRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(
          profileRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
          },
          (err) => {
            console.error('Profile snapshot error:', err);
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          }
        );

        // Fetch /api/me for admin status
        const token = await currentUser.getIdToken();
        const resp = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const data: MeResponse = await resp.json();
          setIsAdmin(Boolean(data.isAdmin));
          setAdminSetupNeeded(Boolean(data.adminSetupNeeded));
        }
      } catch (err) {
        console.warn('Error checking initial auth state:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setIsAdmin(false);
      setAdminSetupNeeded(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        adminSetupNeeded,
        loading,
        refreshMe,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
