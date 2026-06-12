import { request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'http://127.0.0.1:8000/api/v1/';
const APP_ORIGIN = 'http://localhost:5173';
const AUTH_DIR = path.resolve('tests/e2e/.auth');

async function buildStorageState(api, username, password) {
  const loginResponse = await api.post('auth/login', {
    data: { username, password },
  });
  if (!loginResponse.ok()) {
    throw new Error(`E2E login failed for ${username}: ${loginResponse.status()}`);
  }

  const tokenData = await loginResponse.json();
  const headers = { Authorization: `Bearer ${tokenData.access_token}` };
  const profileResponse = await api.get('auth/profile', { headers });
  if (!profileResponse.ok()) {
    throw new Error(`E2E profile failed for ${username}: ${profileResponse.status()}`);
  }

  const profile = await profileResponse.json();
  let farms = [];
  if (profile.role !== 'superadmin') {
    const farmsResponse = await api.get('farms', { headers });
    if (farmsResponse.ok()) farms = await farmsResponse.json();
  }

  const localStorage = [
    { name: 'token', value: tokenData.access_token },
    { name: 'user', value: JSON.stringify(profile) },
    { name: 'user_farms', value: JSON.stringify(farms) },
  ];
  if (tokenData.csrf_token) {
    localStorage.push({ name: 'csrf_token', value: tokenData.csrf_token });
  }
  if (farms.length > 0) {
    localStorage.push({ name: 'selected_farm_id', value: String(farms[0].id) });
  }

  return {
    cookies: [],
    origins: [{ origin: APP_ORIGIN, localStorage }],
  };
}

export default async function globalSetup() {
  const api = await request.newContext({ baseURL: API_BASE });
  // Surcharge par env quand le mot de passe local diffère du seed
  // (ex. compte dédié e2e_owner créé par backend/scripts/create_e2e_user.py)
  const ownerUser  = process.env.E2E_OWNER_USER  || 'admin';
  const ownerPass  = process.env.E2E_OWNER_PASS  || 'admin123';
  const superUser  = process.env.E2E_SUPER_USER  || 'superadmin';
  const superPass  = process.env.E2E_SUPER_PASS  || 'SuperAdmin2026!';
  try {
    const ownerState = await buildStorageState(api, ownerUser, ownerPass);
    const superadminState = await buildStorageState(api, superUser, superPass);
    await mkdir(AUTH_DIR, { recursive: true });
    await Promise.all([
      writeFile(path.join(AUTH_DIR, 'owner.json'), JSON.stringify(ownerState)),
      writeFile(path.join(AUTH_DIR, 'superadmin.json'), JSON.stringify(superadminState)),
    ]);
  } finally {
    await api.dispose();
  }
}
