import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ username, password });
      localStorage.setItem('token', data.access_token);
      const profile = await authAPI.profile();
      localStorage.setItem('user', JSON.stringify(profile.data));
      setUser(profile.data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const workerRequestOtp = async (phoneNumber) => {
    setLoading(true);
    try {
      const { data } = await authAPI.workerRequestOtp(phoneNumber);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || 'Erreur lors de l\'envoi du code.' };
    } finally {
      setLoading(false);
    }
  };

  const workerVerifyOtp = async (phoneNumber, otp) => {
    setLoading(true);
    try {
      const { data } = await authAPI.workerVerifyOtp(phoneNumber, otp);
      localStorage.setItem('token', data.access_token);
      const userObj = {
        role: data.role,
        farm_id: data.farm_id,
        full_name: data.worker_name,
        username: data.worker_name,
        phone_number: data.phone_number
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || 'Code OTP invalide.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      await authAPI.register(payload);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, workerRequestOtp, workerVerifyOtp, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context || {};
};
