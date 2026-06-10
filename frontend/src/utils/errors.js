/**
 * Error normalisation helpers.
 *
 * FastAPI/Pydantic v2 returns 422 validation errors as an ARRAY of objects:
 *   detail: [{ type, loc, msg, input, ctx, url }, ...]
 * Rendering that object straight into JSX crashes React with
 *   "Objects are not valid as a React child".
 *
 * These helpers always collapse any `detail` shape (string | array | object)
 * into a human-readable string so the UI can render it safely.
 */

/** Turn a single Pydantic error object into "champ: message". */
function formatPydanticError(item) {
  if (!item || typeof item !== 'object') return String(item ?? '');
  const msg = item.msg || item.message || '';
  // loc is like ["body", "success_url"] — keep the meaningful tail
  const loc = Array.isArray(item.loc)
    ? item.loc.filter(p => p !== 'body' && p !== 'query' && p !== 'path').join('.')
    : '';
  return loc ? `${loc}: ${msg}` : (msg || JSON.stringify(item));
}

/** Normalise any FastAPI `detail` value to a single string. */
export function normalizeDetail(detail) {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(formatPydanticError).filter(Boolean).join(' · ');
  }
  if (typeof detail === 'object') {
    if (typeof detail.msg === 'string') return formatPydanticError(detail);
    return JSON.stringify(detail);
  }
  return String(detail);
}

/**
 * Extract a safe, human-readable message from any error:
 * axios error, fetch-parsed body, raw detail, or plain Error.
 */
export function getErrorMessage(err, fallback = 'Une erreur est survenue.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // axios-style: err.response.data.detail
  const data = err.response?.data ?? err.data ?? err;
  const detail = data?.detail ?? data?.message ?? data;
  const msg = normalizeDetail(detail);
  if (msg) return msg;

  if (err.message) return err.message;
  return fallback;
}
