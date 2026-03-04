/**
 * Flatten a single registration into a key→value map.
 *
 * Sources (in priority order):
 *  1. Top-level registration metadata (id, status, confirmed, …)
 *  2. registreeData component fields
 *  3. registrationPayload section fields — all sections merged, section names dropped
 */
export function flattenRegistration(reg: any): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    id: reg.id,
    registrationStatus: reg.registrationStatus,
    confirmed: reg.confirmed,
    firstTimeRegistered: reg.firstTimeRegistered,
    createdAt: reg.createdAt,
  };

  // registreeData fields
  const d = reg.registreeData || {};
  for (const [k, v] of Object.entries(d)) {
    if (k === 'id' || k === '__component') continue;
    flat[k] = v;
  }

  // registrationPayload — flatten all sections, section names are ignored
  const payload: Record<string, unknown> = reg.registrationPayload || {};
  for (const section of Object.values(payload)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      for (const [k, v] of Object.entries(section as Record<string, unknown>)) {
        flat[k] = v;
      }
    }
  }

  return flat;
}

/**
 * Collect all unique field keys that appear across all registrations.
 * Returns them in a stable order: metadata → registreeData → payload fields.
 */
export function discoverFields(registrations: any[]): string[] {
  const metaKeys: string[] = [
    'id',
    'registrationStatus',
    'confirmed',
    'firstTimeRegistered',
    'createdAt',
  ];

  const registreeKeys = new Set<string>();
  const payloadKeys = new Set<string>();

  for (const reg of registrations) {
    const d = reg.registreeData || {};
    for (const k of Object.keys(d)) {
      if (k !== 'id' && k !== '__component') registreeKeys.add(k);
    }

    const payload: Record<string, unknown> = reg.registrationPayload || {};
    for (const section of Object.values(payload)) {
      if (section && typeof section === 'object' && !Array.isArray(section)) {
        for (const k of Object.keys(section as object)) {
          payloadKeys.add(k);
        }
      }
    }
  }

  return [...metaKeys, ...registreeKeys, ...payloadKeys];
}

/**
 * Generate a UTF-8 CSV string (with BOM for Excel compatibility).
 * Only the columns listed in `selectedFields` are emitted.
 */
export function generateCsvString(
  registrations: any[],
  selectedFields: string[],
): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = registrations.map((reg) => {
    const flat = flattenRegistration(reg);
    return selectedFields.map((field) => escape(flat[field])).join(',');
  });

  // UTF-8 BOM ensures Excel on Windows handles Vietnamese diacritics correctly
  return '\uFEFF' + [selectedFields.join(','), ...rows].join('\r\n');
}
