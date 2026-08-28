<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: ''
  },
  placeholder: {
    type: String,
    default: '$ 0,00'
  },
  required: {
    type: Boolean,
    default: false
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  prefix: {
    type: String,
    default: '$ '
  }
});

const emit = defineEmits(['update:modelValue']);
const displayValue = ref('');

// Formatea un número o string numérico a formato moneda visible (ej: 9500000 -> "$ 9.500.000")
const formatToDisplay = (val) => {
  if (val === null || val === undefined || val === '') return '';

  const strVal = String(val).replace(',', '.');
  const num = parseFloat(strVal);
  if (isNaN(num)) return '';

  const parts = strVal.split('.');
  const intFormatted = parseInt(parts[0] || '0', 10).toLocaleString('es-AR');

  if (parts.length > 1) {
    const decPart = parts[1].slice(0, 2);
    return `${props.prefix}${intFormatted},${decPart}`;
  }
  return `${props.prefix}${intFormatted}`;
};

// Extraer el valor numérico puro del texto visible
function parseRawValue(text) {
  if (!text) return '';
  let clean = text.replace(props.prefix, '').replace(/[^0-9,]/g, '');
  if (!clean) return '';
  clean = clean.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? '' : num;
}

// Sincronizar displayValue cuando el modelValue cambia externamente (ej: al abrir modal)
watch(
  () => props.modelValue,
  (newVal) => {
    const currentParsed = parseRawValue(displayValue.value);
    if (newVal !== currentParsed) {
      displayValue.value = formatToDisplay(newVal);
    }
  },
  { immediate: true }
);

// Manejador de evento al escribir en el input
const handleInput = (e) => {
  const inputVal = e.target.value;
  
  if (!inputVal) {
    displayValue.value = '';
    emit('update:modelValue', '');
    return;
  }

  // Conservar solo dígitos y como máximo una coma decimal
  let raw = inputVal.replace(props.prefix, '').replace(/[^0-9,]/g, '');
  
  // Evitar múltiples comas
  const commaCount = (raw.match(/,/g) || []).length;
  if (commaCount > 1) {
    const parts = raw.split(',');
    raw = parts[0] + ',' + parts.slice(1).join('');
  }

  const parts = raw.split(',');
  const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('es-AR') : '0';
  
  let formatted = `${props.prefix}${intPart}`;
  
  if (parts.length > 1) {
    const decPart = parts[1].slice(0, 2);
    formatted += `,${decPart}`;
  } else if (raw.endsWith(',')) {
    formatted += ',';
  }

  displayValue.value = formatted;
  const numVal = parseRawValue(formatted);
  emit('update:modelValue', numVal);
};

const handleBlur = () => {
  if (displayValue.value && !displayValue.value.includes(',')) {
    const num = parseRawValue(displayValue.value);
    if (num !== '') {
      displayValue.value = formatToDisplay(num);
    }
  }
};
</script>

<template>
  <input
    type="text"
    inputmode="decimal"
    :value="displayValue"
    :placeholder="placeholder"
    :required="required"
    :autofocus="autofocus"
    @input="handleInput"
    @blur="handleBlur"
    class="money-input"
  />
</template>

<style scoped>
.money-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  color: #00FF66;
  font-size: 1rem;
  font-weight: 700;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.money-input:focus {
  border-color: #00FF66;
  box-shadow: 0 0 10px rgba(0, 255, 102, 0.15);
  outline: none;
}
</style>
