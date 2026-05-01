import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginInput, RegisterInput } from '../types/auth.types';
import * as authService from '../services/auth.service';
import { clearAuthTokens } from '../services/api';

interface AuthContextValue {
  user:       User | null;
  isLoading:  boolean;
  isLoggedIn: boolean;
  login:      (data: LoginInput)    => Promise<void>;
  register:   (data: RegisterInput) => Promise<void>;
  logout:     () => Promise<void>;
  updateUser: (patch: Partial<User> | User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authService.getMe()
      .then(setUser)
      .catch(() => {
        clearAuthTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(data: LoginInput) {
    const result = await authService.login(data);
    localStorage.setItem('accessToken',  result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    setUser(result.user);
  }

  async function register(data: RegisterInput) {
    const result = await authService.register(data);
    localStorage.setItem('accessToken',  result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    setUser(result.user);
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // ignore server errors on logout
    }
    clearAuthTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isLoggedIn: !!user,
      login,
      register,
      logout,
      updateUser: (patch) => setUser(prev => prev ? { ...prev, ...patch } as User : (patch as User)),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
