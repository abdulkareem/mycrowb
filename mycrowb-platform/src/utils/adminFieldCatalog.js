const STORAGE_KEY = 'admin-field-catalog';

const defaultCatalog = {
  clusters: [],
  districts: [],
  states: []
};

function uniqueSorted(values = []) {
  return [...new Set(values.map((value) => `${value || ''}`.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function getAdminFieldCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCatalog;
    const parsed = JSON.parse(raw);
    return {
      clusters: uniqueSorted(parsed?.clusters || []),
      districts: uniqueSorted(parsed?.districts || []),
      states: uniqueSorted(parsed?.states || [])
    };
  } catch (_error) {
    return defaultCatalog;
  }
}

export function saveAdminFieldCatalog(catalog) {
  const normalized = {
    clusters: uniqueSorted(catalog?.clusters || []),
    districts: uniqueSorted(catalog?.districts || []),
    states: uniqueSorted(catalog?.states || [])
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function mergeWithCatalog(dynamicValues = [], catalogValues = []) {
  return uniqueSorted([...(dynamicValues || []), ...(catalogValues || [])]);
}
