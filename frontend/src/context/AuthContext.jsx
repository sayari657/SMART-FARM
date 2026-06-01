import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI, farmsAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  // farms = list of farms the current user owns/has access to
  const [farms, setFarms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user_farms')) || []; } catch { return []; }
  });

  const [farmId, setFarmIdState] = useState(() => {
    const stored = localStorage.getItem('selected_farm_id');
    return stored ? parseInt(stored, 10) : null;
  });

  const [loading, setLoading] = useState(false);

  const _persistFarms = useCallback((list) => {
    setFarms(list);
    localStorage.setItem('user_farms', JSON.stringify(list));
  }, []);

  const _persistFarmId = useCallback((id) => {
    setFarmIdState(id);
    if (id != null) localStorage.setItem('selected_farm_id', String(id));
    else localStorage.removeItem('selected_farm_id');
  }, []);

  // Reload the user's farms from the server and pick the right active farm
  const refreshFarms = useCallback(async (currentFarmId) => {
    try {
      const res = await farmsAPI.list();
      const list = Array.isArray(res.data) ? res.data : [];
      _persistFarms(list);

      if (list.length === 0) {
        // User has no farms — clear selection
        _persistFarmId(null);
        return list;
      }

      const ids = list.map(f => f.id);
      if (currentFarmId != null && ids.includes(currentFarmId)) {
        // Keep current selection — it's still valid
        _persistFarmId(currentFarmId);
      } else {
        // Auto-select user's first own farm
        _persistFarmId(list[0].id);
      }
      return list;
    } catch {
      return [];
    }
  }, [_persistFarms, _persistFarmId]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ username, password });
      localStorage.setItem('token', data.access_token);
      const profile = await authAPI.profile();
      localStorage.setItem('user', JSON.stringify(profile.data));
      setUser(profile.data);

      if (profile.data.role === 'owner') {
        const storedId = localStorage.getItem('selected_farm_id');
        await refreshFarms(storedId ? parseInt(storedId, 10) : null);
      }
      return { ok: true };
    } catch (e) {
      if (e.isBackendOffline) return { ok: false, error: e.friendlyMessage, offline: true };
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
      return { ok: false, error: e.response?.data?.detail || "Erreur lors de l'envoi du code." };
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
        phone_number: data.phone_number,
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      if (data.farm_id) {
        _persistFarmId(data.farm_id);
        _persistFarms([{ id: data.farm_id, name: 'Ma Ferme' }]);
      }
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
    localStorage.removeItem('selected_farm_id');
    localStorage.removeItem('user_farms');
    setUser(null);
    setFarmIdState(null);
    setFarms([]);
  };

  // Called by FarmSelector when the user manually switches farm
  const switchFarm = useCallback((id) => {
    _persistFarmId(id);
  }, [_persistFarmId]);

  // Called after creating a new farm — refreshes the list and selects the new farm
  const onFarmCreated = useCallback(async (newFarmId) => {
    await refreshFarms(newFarmId);
  }, [refreshFarms]);

  return (
    <AuthContext.Provider value={{
      user,
      farms,
      farmId,
      setFarmId: _persistFarmId,
      switchFarm,
      refreshFarms,
      onFarmCreated,
      loading,
      login,
      workerRequestOtp,
      workerVerifyOtp,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
