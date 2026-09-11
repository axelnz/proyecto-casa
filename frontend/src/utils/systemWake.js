export function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelado', 'AbortError'));
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelado', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

// Poll status only. Never repeat login, writes or an uncertain restore request.
export async function monitorSystem({
  getStatus, restore, onStatus, activationCode, signal,
  maxWaitMs = 5 * 60 * 1000, intervalMs = 5000, now = Date.now, sleep = waitForRetry
}) {
  const started = now();
  let restoreAttempted = false;
  while (now() - started < maxWaitMs) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    let status;
    try {
      status = await getStatus(signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error.response?.status === 429) throw new Error('Demasiadas comprobaciones. Esperá un minuto y volvé a intentar.');
      if (error.configurationError || (error.response && ![502, 503, 504].includes(error.response.status))) throw error;
      onStatus({ state: 'connecting', message: error.response?.data?.error || 'Esperando al servidor. Puede estar iniciándose…' });
      await sleep(intervalMs, signal);
      continue;
    }
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    onStatus(status);
    if (status.state === 'ready') return status;
    if (status.state === 'unavailable') throw new Error(status.message);
    if (status.state === 'paused' && !restoreAttempted) {
      if (!activationCode) return status;
      restoreAttempted = true;
      onStatus({ state: 'restoring', message: 'Solicitando la activación del sistema…' });
      let restored;
      try {
        restored = await restore(activationCode, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error.response && ![502, 503, 504].includes(error.response.status)) throw error;
        if (error.configurationError) throw error;
        // The request might have succeeded despite a timeout. Only check its status.
        onStatus({ state: 'restoring', message: 'Comprobando si la activación fue recibida…' });
      }
      if (restored) {
        if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
        onStatus(restored);
        if (restored.state === 'ready') return restored;
        if (restored.state === 'unavailable') throw new Error(restored.message);
      }
    }
    await sleep(intervalMs, signal);
  }
  throw new Error('Todavía no pudimos confirmar que el sistema esté listo. Podés volver a comprobar; la activación puede seguir en curso.');
}
