import axios from 'axios';

// Public status and a separate wake permission; never send the user's JWT here.
const systemApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000
});
const states = new Set(['ready', 'paused', 'restoring', 'checking_database', 'unavailable']);
const readStatus = response => {
  if (!states.has(response.data?.state)) {
    const error = new Error('El servidor necesita actualizarse para activar el sistema desde esta pantalla.');
    error.configurationError = true;
    throw error;
  }
  return response.data;
};

export const getSystemStatus = signal => systemApi.get('/system/status', { signal }).then(readStatus);
export const wakeSystem = (activationCode, signal) => systemApi.post('/system/wake', { activationCode }, { signal }).then(readStatus);
