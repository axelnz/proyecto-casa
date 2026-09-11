<script setup>
import { computed } from 'vue';

const props = defineProps({
  column: { type: String, required: true },
  label: { type: String, required: true },
  sort: { type: Object, required: true }
});
const emit = defineEmits(['sort']);
const handleClick = () => emit('sort', props.column);
const active = computed(() => props.sort.key === props.column);
const descendingNext = computed(() => active.value && props.sort.direction === 'asc');
</script>

<template>
  <th scope="col" class="sortable-header" :aria-sort="active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'">
    <button type="button" class="sort-button" @click="handleClick"
      :aria-label="`${label}: ordenar ${descendingNext ? 'de mayor a menor' : 'de menor a mayor'}`"
      :title="`Ordenar ${descendingNext ? 'descendente' : 'ascendente'}`">
      {{ label }}
      <span v-if="active" class="sort-arrow" aria-hidden="true">{{ sort.direction === 'asc' ? '↑' : '↓' }}</span>
    </button>
  </th>
</template>

<style scoped>
.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  cursor: pointer;
}
.sort-button:hover, .sort-arrow { color: #00FF66; }
.sort-button:focus-visible { outline: 2px solid #00FF66; outline-offset: 4px; border-radius: 3px; }
.sort-arrow { font-size: 1rem; line-height: 1; }
</style>
