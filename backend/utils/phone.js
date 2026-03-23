/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * Returns null if the input is falsy.
 */
function normalizePhone(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) return null;
  const digits = String(phone).trim().replace(/\D/g, '');
  if (!digits) return null;
  // Already has country code (11 digits starting with 1) → prepend +
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // 10-digit US number → prepend +1
  if (digits.length === 10) return `+1${digits}`;
  // Already in E.164 with + sign
  const raw = String(phone).trim();
  if (raw.startsWith('+')) return raw;
  // Fallback: prepend +1 and hope for the best
  return `+1${digits}`;
}

module.exports = { normalizePhone };
