const { createHash, timingSafeEqual } = require('node:crypto');

const RESTORE_COOLDOWN_MS = 5 * 60 * 1000;
const CACHE_MS = 5000;
const TRANSITION_STATES = new Set(['RESTORING', 'COMING_UP', 'UPGRADING', 'PAUSING']);

class SystemError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createSystemService({ env = process.env, checkDatabase, fetchImpl = fetch, now = Date.now }) {
  const projectRef = env.SUPABASE_PROJECT_REF || '';
  const token = env.SUPABASE_MANAGEMENT_TOKEN || '';
  const activationCode = env.SYSTEM_WAKE_CODE || '';
  const configured = /^[a-z]{20}$/.test(projectRef) && !!token && activationCode.length >= 12 && activationCode.length <= 256;
  let cached;
  let cacheUntil = 0;
  let statusRequest;
  let restoreRequest;
  let lastRestoreAttempt = null;

  const result = (state, message, canWake = false) => ({ state, message, canWake });
  const restoring = () => result('restoring', 'Levantando la base de datos. Esto puede tardar unos minutos.');
  const recentlyRequested = () => lastRestoreAttempt !== null && now() - lastRestoreAttempt < RESTORE_COOLDOWN_MS;

  async function management(path = '', method = 'GET') {
    let response;
    try {
      response = await fetchImpl(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
        redirect: 'error'
      });
    } catch {
      throw new SystemError(503, 'No pudimos confirmar la respuesta de Supabase. Esperá y volvé a comprobar el estado.');
    }
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) {
        throw new SystemError(503, 'El administrador debe revisar la configuración del permiso de activación.');
      }
      if (response.status === 429) {
        throw new SystemError(429, 'Supabase recibió demasiadas solicitudes. Esperá unos minutos.');
      }
      throw new SystemError(503, 'Supabase no pudo completar la solicitud. Esperá y comprobá el estado.');
    }
    // The restore endpoint acknowledges the request; it does not report completion.
    return method === 'GET' ? response.json() : undefined;
  }

  async function inspect() {
    if (await checkDatabase()) return result('ready', 'Sistema listo. Ya podés ingresar.');
    if (!configured) {
      return result('unavailable', 'No hay conexión con la base. El administrador debe configurar la activación desde la app.');
    }
    const project = await management();
    if (project.status === 'INACTIVE') {
      return recentlyRequested() ? restoring() : result('paused', 'El sistema está pausado. Podés despertarlo desde acá.', true);
    }
    if (TRANSITION_STATES.has(project.status)) return restoring();
    if (project.status === 'ACTIVE_HEALTHY' || project.status === 'ACTIVE_UNHEALTHY') {
      return result('checking_database', 'Comprobando la conexión con la base de datos…');
    }
    return result('unavailable', 'El proyecto necesita revisión del administrador antes de poder iniciarse.');
  }

  async function getStatus() {
    if (cached && now() < cacheUntil) return cached;
    if (!statusRequest) {
      statusRequest = inspect().then(value => {
        cached = value;
        cacheUntil = now() + CACHE_MS;
        return value;
      }).finally(() => { statusRequest = null; });
    }
    return statusRequest;
  }

  function authorize(code) {
    if (!configured) throw new SystemError(503, 'El administrador debe configurar la activación desde la app.');
    const supplied = typeof code === 'string' && code.length <= 256 ? code : '';
    const digest = text => createHash('sha256').update(text).digest();
    if (!timingSafeEqual(digest(supplied), digest(activationCode))) {
      throw new SystemError(403, 'El código de activación no es correcto.');
    }
  }

  async function restore(code) {
    // Does not depend on users, sessions or a connection to the sleeping database.
    authorize(code);
    if (restoreRequest) return restoreRequest;
    restoreRequest = (async () => {
      const status = await getStatus();
      if (status.state !== 'paused') return status;
      if (recentlyRequested()) return restoring();
      // Set before sending. A lost response must not cause repeated restore operations.
      lastRestoreAttempt = now();
      try {
        await management('/restore', 'POST');
        return restoring();
      } finally {
        cached = undefined;
        cacheUntil = 0;
      }
    })().finally(() => { restoreRequest = null; });
    return restoreRequest;
  }

  return { getStatus, restore };
}

module.exports = { createSystemService, SystemError };
