function normalizeMobile(mobile) {
  if (mobile === null || mobile === undefined) return '';
  const cleaned = String(mobile).replace(/\D/g, '');

  if (cleaned.length === 10) {
    return cleaned;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }

  if (cleaned.length > 10) {
    return cleaned.slice(-10);
  }

  return cleaned;
}

function mobileLookupVariants(mobile) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return [];

  return Array.from(new Set([
    normalized,
    `+91${normalized}`,
    `91${normalized}`
  ]));
}

module.exports = { normalizeMobile, mobileLookupVariants };
