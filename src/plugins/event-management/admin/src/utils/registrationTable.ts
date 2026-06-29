// â”€â”€ Value extraction, unique values and multi-level grouping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Registrations carry dynamic columns from three sources:
//   1. fixed meta fields (id, registrationStatus, confirmed, â€¦)
//   2. registreeData component fields (fullName, email, â€¦)
//   3. registrationPayload sections, keyed as `sectionKey__fieldKey`
//
// `cellText` returns the same human-readable string the table cell shows (minus
// styling) for ANY field key, so filtering, the value checklist and group labels
// all agree with what the user sees on screen. Empty values normalise to "".

/** Placeholder shown for an empty group value. */
export const EMPTY_LABEL = "(Trá»‘ng)";

function formatDate(value: unknown): string {
  if (!value) return "";
  try {
    return new Date(value as string).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function yesNo(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

/**
 * Resolve a field key to the display string for a given registration.
 * Mirrors the rendering in RegistrationTable's `renderCell`. Empty â†’ "".
 */
export function cellText(reg: any, field: string): string {
  switch (field) {
    case "id":
      return reg.id != null ? String(reg.id) : "";
    case "registrationStatus":
      return reg.registrationStatus ?? "";
    case "confirmed":
      return yesNo(reg.confirmed);
    case "confirmationEmailSentAt":
      return formatDate(reg.confirmationEmailSentAt);
    case "firstTimeRegistered":
      return reg.firstTimeRegistered ? "Yes" : "No";
    case "createdAt":
      return formatDate(reg.createdAt);
  }

  // registreeData fields
  if (reg.registreeData && field in reg.registreeData) {
    const val = reg.registreeData[field];
    if (typeof val === "boolean") return yesNo(val);
    return val != null && val !== "" ? String(val) : "";
  }

  // registrationPayload fields â€” key format is sectionKey__fieldKey
  if (field.includes("__") && reg.registrationPayload) {
    const sep = field.indexOf("__");
    const sectionKey = field.slice(0, sep);
    const fieldKey = field.slice(sep + 2);
    const section = reg.registrationPayload[sectionKey];
    if (section && fieldKey in section) {
      const val = section[fieldKey];
      if (typeof val === "boolean") return yesNo(val);
      return val != null && val !== "" ? String(val) : "";
    }
  }

  return "";
}

/** Distinct non-collapsed string values for a field, sorted for display. */
export function uniqueValues(rows: any[], field: string): string[] {
  const set = new Set<string>();
  for (const reg of rows) set.add(cellText(reg, field));
  return [...set].sort((a, b) => {
    if (a === "") return 1; // push empty to the end
    if (b === "") return -1;
    return a.localeCompare(b, "vi");
  });
}

/** Compare two registrations by a field for sorting (numeric for id). */
export function compareByField(
  a: any,
  b: any,
  field: string,
  order: "asc" | "desc",
): number {
  const dir = order === "desc" ? -1 : 1;
  if (field === "id") {
    return dir * ((Number(a.id) || 0) - (Number(b.id) || 0));
  }
  return dir * cellText(a, field).localeCompare(cellText(b, field), "vi");
}

// â”€â”€ Multi-level grouping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GroupNode {
  field: string;
  value: string; // display value ("" â†’ empty)
  path: string; // unique path key across the whole tree
  count: number;
  children?: GroupNode[]; // present when more grouping levels remain
  rows?: any[]; // present at the deepest level
}

const PATH_SEP = "\u0001";

/**
 * Build a hierarchy of groups from `rows` following the ordered `groupBy` keys.
 * `rows` are assumed already sorted; insertion order of groups is preserved.
 */
export function buildGroupTree(
  rows: any[],
  groupBy: string[],
  parentPath = "",
): GroupNode[] {
  if (groupBy.length === 0) return [];
  const [field, ...rest] = groupBy;

  const buckets = new Map<string, any[]>();
  for (const reg of rows) {
    const value = cellText(reg, field);
    const bucket = buckets.get(value);
    if (bucket) bucket.push(reg);
    else buckets.set(value, [reg]);
  }

  const nodes: GroupNode[] = [];
  for (const [value, bucketRows] of buckets) {
    const path = `${parentPath}${PATH_SEP}${field}=${value}`;
    const node: GroupNode = {
      field,
      value,
      path,
      count: bucketRows.length,
    };
    if (rest.length > 0) {
      node.children = buildGroupTree(bucketRows, rest, path);
    } else {
      node.rows = bucketRows;
    }
    nodes.push(node);
  }
  return nodes;
}

export type RenderItem =
  | {
      type: "group";
      level: number;
      field: string;
      value: string;
      path: string;
      count: number;
      collapsed: boolean;
    }
  | { type: "row"; reg: any };

/**
 * Flatten a group tree into a render list of group-header and data rows.
 * Children of a collapsed group (path present in `collapsed`) are skipped.
 */
export function flattenGroupTree(
  nodes: GroupNode[],
  collapsed: Set<string>,
  level = 0,
): RenderItem[] {
  const items: RenderItem[] = [];
  for (const node of nodes) {
    const isCollapsed = collapsed.has(node.path);
    items.push({
      type: "group",
      level,
      field: node.field,
      value: node.value,
      path: node.path,
      count: node.count,
      collapsed: isCollapsed,
    });
    if (isCollapsed) continue;
    if (node.children) {
      items.push(...flattenGroupTree(node.children, collapsed, level + 1));
    } else if (node.rows) {
      for (const reg of node.rows) items.push({ type: "row", reg });
    }
  }
  return items;
}
