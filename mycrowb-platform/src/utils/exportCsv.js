const escapeValue = (value) => {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
};

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((column) => escapeValue(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeValue(row[column.key])).join(','))
    .join('\n');

  const csvContent = [header, body].filter(Boolean).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
