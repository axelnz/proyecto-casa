import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useTableSort } from '../src/composables/useTableSort.js';
import { sortRows } from '../src/utils/tableSort.js';

test('preserves initial order, toggles date ascending/descending and resets a new column to ascending', () => {
  const rows = ref([
    { id: 1, date: '2026-09-10 08:00:00', amount: '10' },
    { id: 2, date: '2025-12-31 23:59:00', amount: '100' },
    { id: 3, date: '2026-09-09 14:00:00', amount: '2' }
  ]);
  const { sort, toggleSort, sortedRows } = useTableSort(rows, { date: { type: 'date' }, amount: { type: 'number' } });
  const ids = () => sortedRows.value.map(row => row.id);
  assert.equal(sort.key, null);
  assert.deepEqual(ids(), [1, 2, 3]);
  toggleSort('date');
  assert.deepEqual(ids(), [2, 3, 1]);
  toggleSort('date');
  assert.deepEqual(ids(), [1, 3, 2]);
  toggleSort('amount');
  assert.equal(sort.direction, 'asc');
  assert.deepEqual(ids(), [3, 1, 2]);
  assert.deepEqual(rows.value.map(row => row.id), [1, 2, 3]);
  rows.value.push({ id: 4, amount: '1' });
  assert.deepEqual(ids(), [4, 3, 1, 2]);
});

test('Spanish text, natural numbers and equal values sort stably', () => {
  const rows = [{ name: 'Zeta' }, { name: 'Álvaro' }, { name: 'alvaro' }, { name: 'Item 10' }, { name: 'Item 2' }];
  assert.deepEqual(sortRows(rows, { key: 'name', direction: 'asc' }), [rows[1], rows[2], rows[4], rows[3], rows[0]]);
});

test('empty and invalid dates remain at the end in both directions', () => {
  const rows = [{ date: null }, { date: '2026-01-01' }, { date: 'bad' }, { date: '2025-12-31' }];
  assert.deepEqual(sortRows(rows, { key: 'date', direction: 'asc' }, { date: { type: 'date' } }), [rows[3], rows[1], rows[0], rows[2]]);
  assert.deepEqual(sortRows(rows, { key: 'date', direction: 'desc' }, { date: { type: 'date' } }), [rows[1], rows[3], rows[0], rows[2]]);
});

test('expense amounts use the displayed magnitude and periods compare across years', () => {
  const rows = [{ amount: '-100', year: 2025, month: 12 }, { amount: '-2', year: 2026, month: 1 }];
  assert.deepEqual(sortRows(rows, { key: 'amount', direction: 'asc' }, { amount: { type: 'number', value: row => Math.abs(Number(row.amount)) } }), [rows[1], rows[0]]);
  assert.deepEqual(sortRows(rows, { key: 'period', direction: 'asc' }, { period: { type: 'number', value: row => row.year * 12 + row.month } }), rows);
});

test('import preview sorts the full population without mutating the import payload', () => {
  const rows = Array.from({ length: 70 }, (_, index) => ({ amount: 70 - index }));
  const preview = sortRows(rows, { key: 'amount', direction: 'asc' }, { amount: { type: 'number' } }).slice(0, 50);
  assert.equal(preview[0].amount, 1);
  assert.equal(preview[49].amount, 50);
  assert.equal(rows[0].amount, 70);
});
