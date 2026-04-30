const META_LABELS: Record<string, string> = {
  id: 'ID',
  registrationStatus: 'Status',
  confirmed: 'Confirmed',
  firstTimeRegistered: 'First Timer',
  createdAt: 'Registered At',
};

const REGISTREE_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  dob: 'DOB',
  gender: 'Gender',
  email: 'Email',
  address: 'Address',
  phoneNumber: 'Phone',
  haveZalo: 'Have Zalo',
  zaloName: 'Zalo Name',
};

function camelToTitle(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

/**
 * Flatten a single registration into a key→value map.
 *
 * Sources (in priority order):
 *  1. Top-level registration metadata (id, status, confirmed, …)
 *  2. registreeData component fields
 *  3. registrationPayload section fields — keys prefixed as sectionKey__fieldKey
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

  // registrationPayload — flatten with section prefix to avoid collisions
  const payload: Record<string, unknown> = reg.registrationPayload || {};
  for (const [sectionKey, section] of Object.entries(payload)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      for (const [k, v] of Object.entries(section as Record<string, unknown>)) {
        flat[`${sectionKey}__${k}`] = v;
      }
    }
  }

  return flat;
}

/**
 * Collect all unique field descriptors that appear across all registrations.
 * Returns them in a stable order: metadata → registreeData → payload fields.
 * Each descriptor carries both a raw key (used in flattened data) and a display label.
 */
export function discoverFields(registrations: any[]): { key: string; label: string }[] {
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
    for (const [sectionKey, section] of Object.entries(payload)) {
      if (section && typeof section === 'object' && !Array.isArray(section)) {
        for (const k of Object.keys(section as object)) {
          payloadKeys.add(`${sectionKey}__${k}`);
        }
      }
    }
  }

  const toDescriptor = (key: string): { key: string; label: string } => {
    if (META_LABELS[key]) return { key, label: META_LABELS[key] };
    if (REGISTREE_LABELS[key]) return { key, label: REGISTREE_LABELS[key] };
    if (key.includes('__')) {
      const sep = key.indexOf('__');
      const sectionKey = key.slice(0, sep);
      const fieldKey = key.slice(sep + 2);
      return { key, label: `${camelToTitle(sectionKey)} - ${fieldKey}` };
    }
    return { key, label: key };
  };

  return [
    ...metaKeys.map(toDescriptor),
    ...[...registreeKeys].map(toDescriptor),
    ...[...payloadKeys].map(toDescriptor),
  ];
}

/**
 * Generate a UTF-8 CSV string (with BOM for Excel compatibility).
 * Only the columns listed in `selectedFields` are emitted.
 * The header row uses display labels; data rows use the raw keys.
 */
export function generateCsvString(
  registrations: any[],
  selectedFields: { key: string; label: string }[],
): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = selectedFields.map((f) => escape(f.label)).join(',');
  const rows = registrations.map((reg) => {
    const flat = flattenRegistration(reg);
    return selectedFields.map((f) => escape(flat[f.key])).join(',');
  });

  // UTF-8 BOM ensures Excel on Windows handles Vietnamese diacritics correctly
  return '﻿' + [header, ...rows].join('\r\n');
}
