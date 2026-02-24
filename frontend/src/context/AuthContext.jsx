import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, extractErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('campusstay_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('campusstay_token'));
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((payload) => {
    const sessionUser = {
      userId: payload.userId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      landlordVerificationStatus: payload.landlordVerificationStatus
    };

    setToken(payload.token);
    setUser(sessionUser);
    localStorage.setItem('campusstay_token', payload.token);
    localStorage.setItem('campusstay_user', JSON.stringify(sessionUser));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campusstay_token');
    localStorage.removeItem('campusstay_user');
  }, []);

  const login = useCallback(
    async (credentials) => {
      setLoading(true);
      try {
        const { data } = await apiClient.post('/auth/login', credentials);
        persistSession(data);
        return data;
      } catch (error) {
        throw new Error(extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const registerStudent = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await apiClient.post('/auth/register/student', payload);
        persistSession(data);
        return data;
      } catch (error) {
        throw new Error(extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const registerLandlord = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await apiClient.post('/auth/register/landlord', payload);
        persistSession(data);
        return data;
      } catch (error) {
        throw new Error(extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem('campusstay_token')) {
      return;
    }

    try {
      const { data } = await apiClient.get('/users/me');
      const refreshedUser = {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        landlordVerificationStatus: data.landlordVerificationStatus
      };

      setUser(refreshedUser);
      localStorage.setItem('campusstay_user', JSON.stringify(refreshedUser));
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    if (token && !user) {
      refreshMe();
    }
  }, [token, user, refreshMe]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout: clearSession,
      registerStudent,
      registerLandlord,
      refreshMe
    }),
    [user, token, loading, login, clearSession, registerStudent, registerLandlord, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
