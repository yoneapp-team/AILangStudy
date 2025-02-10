'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FirebaseError } from 'firebase/app';
import { User } from 'firebase/auth';
import { signInAnonymouslyAndGetUser } from '../lib/firebase';
import { getErrorMessage } from '../lib/errorMessages';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await signInAnonymouslyAndGetUser();
        setUser(user);
      } catch (error) {
        if (!(error instanceof FirebaseError)) {
          throw error;
        }
        const message = getErrorMessage(error);
        alert(message);
        console.error('Authentication error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
