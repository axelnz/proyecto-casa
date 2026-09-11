import { computed, reactive, unref } from 'vue';
import { sortRows } from '../utils/tableSort.js';

export function useTableSort(source, columns = {}) {
  const sort = reactive({ key: null, direction: 'asc' });
  const toggleSort = key => {
    sort.direction = sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    sort.key = key;
  };
  const sortedRows = computed(() => sortRows(
    typeof source === 'function' ? source() : unref(source), sort, columns
  ));
  return { sort, toggleSort, sortedRows };
}
