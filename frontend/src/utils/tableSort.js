const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function normalize(value, type) {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (type === 'date') {
    const date = value instanceof Date ? value.getTime() : Date.parse(String(value).replace(' ', 'T'));
    return Number.isFinite(date) ? date : null;
  }
  return String(value);
}

// Sort a copy: edits, imports and the API's initial order keep their original data.
export function sortRows(rows, sort, columns = {}) {
  const source = rows || [];
  if (!sort.key) return [...source];
  const column = columns[sort.key] || {};
  const getValue = column.value || (row => row[sort.key]);
  const direction = sort.direction === 'desc' ? -1 : 1;

  return source.map((row, index) => ({ row, index, value: normalize(getValue(row), column.type) }))
    .sort((a, b) => {
      // Missing values always go last, including when descending.
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      const comparison = typeof a.value === 'number'
        ? a.value - b.value
        : collator.compare(a.value, b.value);
      return comparison * direction || a.index - b.index;
    }).map(item => item.row);
}
