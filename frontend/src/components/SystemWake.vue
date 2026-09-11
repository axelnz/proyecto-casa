<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { getSystemStatus, wakeSystem } from '../api/system';
import { monitorSystem } from '../utils/systemWake';

const emit = defineEmits(['busy', 'ready']);
const state = ref('checking');
const message = ref('Comprobando disponibilidad…');
const error = ref('');
const busy = ref(false);
let controller;

const steps = ['Conectar al servidor', 'Activar la base', 'Verificar acceso'];
const currentStep = computed(() => state.value === 'ready' ? 3
  : state.value === 'checking_database' ? 2
  : ['paused', 'restoring'].includes(state.value) ? 1 : 0);
const updateStatus = status => {
  state.value = status.state;
  message.value = status.message;
};

onMounted(async () => {
  controller = new AbortController();
  const signal = controller.signal;
  try {
    updateStatus(await getSystemStatus(signal));
  } catch {
    if (signal.aborted) return;
    state.value = 'unknown';
    message.value = 'Si no podés ingresar, comprobá o despertá el sistema.';
  }
});

const start = async () => {
  if (busy.value) return;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  busy.value = true;
  emit('busy', true);
  error.value = '';
  message.value = 'Conectando con el servidor…';
  state.value = 'connecting';
  try {
    const status = await monitorSystem({
      getStatus: getSystemStatus, restore: wakeSystem, onStatus: updateStatus,
      signal
    });
    if (status.state === 'ready') emit('ready');
  } catch (err) {
    if (!signal.aborted) {
      error.value = err.response?.data?.error || err.message || 'No pudimos activar el sistema. Intentá nuevamente.';
    }
  } finally {
    busy.value = false;
    emit('busy', false);
  }
};
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="system-wake" :class="{ 'is-ready': state === 'ready' }" aria-label="Estado del sistema" :aria-busy="busy">
    <p class="system-message" role="status" aria-live="polite">
      <span class="status-dot" aria-hidden="true"></span>{{ message }}
    </p>
    <template v-if="busy">
      <div class="wake-progress" role="progressbar" aria-label="Activación en curso" :aria-valuetext="message"><span></span></div>
      <ol class="wake-steps">
        <li v-for="(step, index) in steps" :key="step" :class="{ done: index < currentStep, current: index === currentStep }">
          <span aria-hidden="true">{{ index < currentStep ? '✓' : index + 1 }}</span> {{ step }}
        </li>
      </ol>
      <p class="wake-hint">Puede tardar unos minutos. El servicio no informa un porcentaje exacto.</p>
    </template>
    <form @submit.prevent="start">
      <button type="submit" class="wake-button" :disabled="busy">
        {{ busy ? 'Levantando sistema…' : state === 'ready' ? 'Comprobar sistema' : 'Despertar sistema' }}
      </button>
    </form>
    <p v-if="error" class="wake-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.system-wake { padding: 1rem; margin-bottom: 1.5rem; border: 1px solid #363c39; border-radius: 10px; background: #141817; }
.system-message { display: flex; align-items: baseline; gap: 0.5rem; margin: 0; color: #c8ceca; font-size: 0.85rem; line-height: 1.5; }
.status-dot { flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: #eac16c; }
.is-ready .status-dot { background: #00ff66; }
.wake-button { width: 100%; margin-top: 0.85rem; padding: 0.7rem; border: 1px solid #00ff66; border-radius: 7px; background: transparent; color: #00ff66; font-weight: 600; }
.wake-button:disabled { opacity: 0.65; cursor: wait; }
.wake-button:focus-visible { outline: 2px solid #00ff66; outline-offset: 3px; }
.wake-progress { height: 5px; background: #2d3631; overflow: hidden; border-radius: 4px; margin-top: 1rem; }
.wake-progress span { display: block; width: 40%; height: 100%; background: #00ff66; animation: waking 1.6s ease-in-out infinite; }
@keyframes waking { from { transform: translateX(-100%); } to { transform: translateX(350%); } }
@media (prefers-reduced-motion: reduce) { .wake-progress span { animation: none; width: 100%; opacity: 0.5; } }
.wake-steps { list-style: none; padding: 0; margin: 0.9rem 0 0; display: grid; gap: 0.45rem; font-size: 0.8rem; color: #858f89; }
.wake-steps .current { color: #fff; }
.wake-steps .done { color: #00ff66; }
.wake-steps span { display: inline-block; width: 1.1rem; }
.wake-hint { font-size: 0.75rem; color: #a5afa8; line-height: 1.5; margin: 0.65rem 0 0; }
.wake-error { color: #ff9999; font-size: 0.8rem; line-height: 1.5; margin: 0.8rem 0 0; }
</style>
