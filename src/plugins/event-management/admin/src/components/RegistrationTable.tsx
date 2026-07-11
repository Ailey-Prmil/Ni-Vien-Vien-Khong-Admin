import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Modal,
  NextLink,
  PageLink,
  Pagination,
  Popover,
  PreviousLink,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Textarea,
  TextInput,
  Tooltip,
  Tr,
  Typography,
} from "@strapi/design-system";
import { useFetchClient, useNotification, useRBAC } from "@strapi/strapi/admin";
import {
  Download,
  Cog,
  ArrowUp,
  ArrowDown,
  Check,
  Cross,
  Filter,
  Plus,
  Pencil,
} from "@strapi/icons";
import { PLUGIN_ID } from "../pluginId";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  cellText,
  compareByField,
  uniqueValues,
  buildGroupTree,
  flattenGroupTree,
  EMPTY_LABEL,
  type RenderItem,
} from "../utils/registrationTable";

// ── Column definitions ────────────────────────────────────────────────────────

/** Known field-name → display-label mappings (backend field names as keys). */
const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  registrationStatus: "Trạng thái",
  confirmed: "Đã xác nhận",
  confirmationEmailSentAt: "Thời gian gửi mail xác nhận",
  firstTimeRegistered: "Lần đầu đăng ký",
  createdAt: "Thời gian đăng ký",
  fullName: "Họ và tên",
  dob: "Sinh nhật",
  gender: "Giới tính",
  email: "Email",
  address: "Địa chỉ",
  phoneNumber: "Số điện thoại",
  zaloName: "Tên hiển thị Zalo",
};

const DEFAULT_VISIBLE_FIELDS: string[] = [
  "fullName",
  "registrationStatus",
  "confirmed",
  "confirmationEmailSentAt",
  "phoneNumber",
  "zaloName",
];
const PAGE_SIZE = 30;
const DEFAULT_COL_WIDTH = 180;
const MIN_COL_WIDTH = 80;

/** Fields that exist in the data/export but must never be offered as table columns. */
const NON_COLUMN_FIELDS: string[] = ["adminNote"];

// ── Data types ────────────────────────────────────────────────────────────────

interface FieldDescriptor {
  key: string;
  label: string;
}

interface Registration {
  id: number;
  registrationStatus: string;
  confirmed: boolean | null;
  firstTimeRegistered: boolean;
  createdAt: string;
  confirmationEmailSentAt?: string;
  adminNote?: string | null;
  registreeData?: Record<string, any>;
  registrationPayload?: Record<string, Record<string, any>>;
}

/** Selected values for a column's checklist filter (empty array = no filter). */
type ColumnFilter = string[];

interface PersistedView {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  columnFilters: Record<string, ColumnFilter>;
  groupBy: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const DEFAULT_VIEW: PersistedView = {
  visibleColumns: DEFAULT_VISIBLE_FIELDS,
  columnWidths: {},
  columnFilters: {},
  groupBy: [],
  sortBy: "createdAt",
  sortOrder: "asc",
};

interface RegistrationTableProps {
  activityId: number;
  reloadKey?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the display label for a field key, falling back to the raw key. */
function fieldLabel(field: string, available: FieldDescriptor[]): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const found = available.find((f) => f.key === field);
  return found?.label ?? field;
}

function statusColor(status: string) {
  if (status === "active") return "success600";
  if (status === "canceled") return "danger600";
  return "warning600";
}

function confirmedLabel(val: boolean | null) {
  if (val === true) return "Yes";
  if (val === false) return "No";
  return "—";
}

// ── Column picker modal ───────────────────────────────────────────────────────

interface ColumnPickerModalProps {
  open: boolean;
  availableFields: FieldDescriptor[];
  visible: string[];
  onChange: (cols: string[]) => void;
  onClose: () => void;
}

function ColumnPickerModal({
  open,
  availableFields,
  visible,
  onChange,
  onClose,
}: ColumnPickerModalProps) {
  const [local, setLocal] = useState<string[]>(visible);

  useEffect(() => {
    if (open) setLocal(visible);
  }, [open]);

  function toggle(key: string) {
    setLocal((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function move(index: number, dir: -1 | 1) {
    setLocal((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Fields not yet selected, in their natural discovery order.
  const unselected = availableFields.filter((f) => !local.includes(f.key));

  return (
    <Modal.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="beta">Chọn & sắp xếp cột</Typography>
        </Modal.Header>
        <Modal.Body>
          <Typography variant="delta">
            Cột đang hiện (kéo thứ tự bằng nút)
          </Typography>
          <Box marginTop={2} marginBottom={4}>
            {local.length === 0 && (
              <Typography textColor="neutral500">Chưa chọn cột nào.</Typography>
            )}
            {local.map((key, index) => (
              <Flex
                key={key}
                justifyContent="space-between"
                alignItems="center"
                paddingTop={1}
                paddingBottom={1}
              >
                <Checkbox checked onCheckedChange={() => toggle(key)}>
                  {fieldLabel(key, availableFields)}
                </Checkbox>
                <Flex gap={1}>
                  <IconButton
                    label="Lên"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    label="Xuống"
                    disabled={index === local.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </IconButton>
                </Flex>
              </Flex>
            ))}
          </Box>

          {unselected.length > 0 && (
            <>
              <Typography variant="delta">Cột ẩn</Typography>
              <Flex wrap="wrap" gap={3} marginTop={2}>
                {unselected.map((field) => (
                  <Box key={field.key} style={{ minWidth: 160 }}>
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggle(field.key)}
                    >
                      {field.label}
                    </Checkbox>
                  </Box>
                ))}
              </Flex>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Flex gap={3} justifyContent="flex-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onChange(local);
                onClose();
              }}
              disabled={local.length === 0}
            >
              Apply
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── Export field picker modal ─────────────────────────────────────────────────

interface FieldPickerModalProps {
  open: boolean;
  availableFields: FieldDescriptor[];
  selectedFields: string[];
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

function FieldPickerModal({
  open,
  availableFields,
  selectedFields,
  onToggle,
  onSelectAll,
  onClearAll,
  onConfirm,
  onClose,
}: FieldPickerModalProps) {
  return (
    <Modal.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="beta">Choose export columns</Typography>
        </Modal.Header>
        <Modal.Body>
          <Flex gap={3} marginBottom={4}>
            <Button size="S" variant="secondary" onClick={onSelectAll}>
              Select all
            </Button>
            <Button size="S" variant="ghost" onClick={onClearAll}>
              Clear all
            </Button>
          </Flex>
          <Flex wrap="wrap" gap={3}>
            {availableFields.map((field) => (
              <Box key={field.key} style={{ minWidth: 200 }}>
                <Checkbox
                  checked={selectedFields.includes(field.key)}
                  onCheckedChange={() => onToggle(field.key)}
                >
                  {field.label}
                </Checkbox>
              </Box>
            ))}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Flex gap={3} justifyContent="flex-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={selectedFields.length === 0}>
              Export CSV
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── Per-column filter control ─────────────────────────────────────────────────

interface ColumnFilterControlProps {
  field: string;
  filter: ColumnFilter | undefined;
  /** Distinct values available for this column (for the checklist). */
  options: string[];
  onChange: (filter: ColumnFilter | undefined) => void;
}

function ColumnFilterControl({
  field,
  filter,
  options,
  onChange,
}: ColumnFilterControlProps) {
  const [open, setOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState("");

  const selected = filter ?? [];
  const active = selected.length > 0;

  const shown = optionSearch
    ? options.filter((o) =>
        (o === "" ? EMPTY_LABEL : o)
          .toLowerCase()
          .includes(optionSearch.toLowerCase()),
      )
    : options;

  function toggleValue(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={`Lọc ${field}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            width: "100%",
            padding: "4px 8px",
            fontSize: 12,
            cursor: "pointer",
            border: "1px solid",
            borderColor: active ? "#4945ff" : "#dcdce4",
            borderRadius: 4,
            background: active ? "#f0f0ff" : "#ffffff",
            color: "#32324d",
          }}
        >
          <Filter width="12px" height="12px" />
          {active ? `Đã chọn ${selected.length}` : "Lọc"}
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <Box
          padding={2}
          style={{ maxHeight: 320, overflowY: "auto", minWidth: 200 }}
        >
          <TextInput
            aria-label="Tìm giá trị"
            placeholder="Tìm giá trị…"
            size="S"
            value={optionSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setOptionSearch(e.target.value)
            }
          />
          <Flex gap={2} marginTop={2} marginBottom={2}>
            <Button
              size="S"
              variant="ghost"
              onClick={() => onChange([...options])}
            >
              Chọn tất cả
            </Button>
            <Button
              size="S"
              variant="ghost"
              onClick={() => onChange(undefined)}
            >
              Bỏ chọn
            </Button>
          </Flex>
          {shown.map((value) => (
            <Box key={value || "__empty__"} paddingTop={1} paddingBottom={1}>
              <Checkbox
                checked={selected.includes(value)}
                onCheckedChange={() => toggleValue(value)}
              >
                {value === "" ? EMPTY_LABEL : value}
              </Checkbox>
            </Box>
          ))}
        </Box>
      </Popover.Content>
    </Popover.Root>
  );
}

// ── Per-row note marker + editor ──────────────────────────────────────────────

/** Leading row marker: a colored dot (only when a note exists) that reveals
 *  the note text on hover. Rendered in the table's first column. */
function NoteDot({ note }: { note?: string | null }) {
  if (!(note && note.trim())) return null;
  return (
    <Tooltip label={note}>
      <span
        aria-label="Có ghi chú"
        style={{ display: "inline-flex", cursor: "help" }}
      >
        <Box
          background="primary600"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
      </span>
    </Tooltip>
  );
}

interface NoteCellProps {
  reg: Registration;
  onSave: (registrationId: number, note: string) => Promise<void>;
}

function NoteCell({ reg, onSave }: NoteCellProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(reg.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  const hasNote = !!(reg.adminNote && reg.adminNote.trim());

  // Seed the editor from the current note each time the popover opens.
  useEffect(() => {
    if (open) setValue(reg.adminNote ?? "");
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(reg.id, value);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton
          label={hasNote ? "Sửa ghi chú" : "Thêm ghi chú"}
          variant="ghost"
          style={hasNote ? undefined : { opacity: 0.45 }}
        >
          <Pencil fill={hasNote ? "primary600" : "neutral500"} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content>
        <Box padding={3} style={{ minWidth: 280 }}>
          <Typography variant="pi" textColor="neutral600">
            Ghi chú
          </Typography>
          <Box marginTop={1} marginBottom={2}>
            <Textarea
              aria-label="Ghi chú"
              placeholder="Nhập ghi chú cho đăng ký này…"
              value={value}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setValue(e.target.value)
              }
              // The popover content sits inside a ScrollArea that treats Space,
              // Enter and arrow keys as scroll commands and preventDefaults them.
              // Stop the keydown here so the textarea receives spaces/newlines.
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
                e.stopPropagation()
              }
            />
          </Box>
          <Flex gap={2} justifyContent="flex-end">
            <Button
              size="S"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Huỷ
            </Button>
            <Button size="S" onClick={handleSave} loading={saving}>
              Lưu
            </Button>
          </Flex>
        </Box>
      </Popover.Content>
    </Popover.Root>
  );
}

// ── Action confirmation modal ─────────────────────────────────────────────────

type ActionType = "promote" | "confirm" | "cancel";

const ACTION_CONFIG: Record<
  ActionType,
  {
    title: string;
    body: (name: string) => string;
    confirmLabel: string;
    confirmVariant: string;
  }
> = {
  promote: {
    title: "Promote registration",
    body: (name) =>
      `Promote ${name ? `"${name}" ` : "this registration "}from the waitlist to active?`,
    confirmLabel: "Promote",
    confirmVariant: "secondary",
  },
  confirm: {
    title: "Confirm registration",
    body: (name) =>
      `Manually confirm ${name ? `"${name}"` : "this registration"} on behalf of the registrant?`,
    confirmLabel: "Confirm",
    confirmVariant: "secondary",
  },
  cancel: {
    title: "Cancel registration",
    body: (name) =>
      `Cancel ${name ? `"${name}"` : "this registration"}? This cannot be undone.`,
    confirmLabel: "Cancel registration",
    confirmVariant: "danger",
  },
};

interface PendingAction {
  type: ActionType;
  registrationId: number;
  name: string;
}

interface ConfirmActionModalProps {
  pending: PendingAction | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmActionModal({
  pending,
  loading,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  if (!pending) return null;
  const cfg = ACTION_CONFIG[pending.type];
  return (
    <Modal.Root open onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="beta">{cfg.title}</Typography>
        </Modal.Header>
        <Modal.Body>
          <Typography>{cfg.body(pending.name)}</Typography>
        </Modal.Body>
        <Modal.Footer>
          <Flex gap={3} justifyContent="flex-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Go back
            </Button>
            <Button
              variant={cfg.confirmVariant as any}
              onClick={onConfirm}
              loading={loading}
            >
              {cfg.confirmLabel}
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── Group-by panel ────────────────────────────────────────────────────────────

interface GroupByPanelProps {
  groupBy: string[];
  visibleColumns: string[];
  availableFields: FieldDescriptor[];
  onChange: (groupBy: string[]) => void;
}

function GroupByPanel({
  groupBy,
  visibleColumns,
  availableFields,
  onChange,
}: GroupByPanelProps) {
  function setLevel(index: number, field: string) {
    const next = [...groupBy];
    next[index] = field;
    onChange(next.filter(Boolean));
  }
  function removeLevel(index: number) {
    onChange(groupBy.filter((_, i) => i !== index));
  }
  function addLevel() {
    const firstUnused = visibleColumns.find((c) => !groupBy.includes(c));
    if (firstUnused) onChange([...groupBy, firstUnused]);
  }

  const canAdd = visibleColumns.some((c) => !groupBy.includes(c));

  return (
    <Flex gap={2} alignItems="center" wrap="wrap">
      <Typography variant="pi" textColor="neutral600">
        Gom nhóm:
      </Typography>
      {groupBy.map((field, index) => (
        <Flex key={`${field}-${index}`} gap={1} alignItems="center">
          <SingleSelect
            size="S"
            value={field}
            onChange={(val: string | number) =>
              setLevel(index, String(val ?? ""))
            }
          >
            {visibleColumns.map((c) => (
              <SingleSelectOption key={c} value={c}>
                {fieldLabel(c, availableFields)}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <IconButton
            label="Xoá cấp"
            size="S"
            onClick={() => removeLevel(index)}
          >
            <Cross />
          </IconButton>
        </Flex>
      ))}
      {canAdd && (
        <Button
          size="S"
          variant="tertiary"
          startIcon={<Plus />}
          onClick={addLevel}
        >
          Thêm cấp
        </Button>
      )}
      {groupBy.length > 0 && (
        <Button size="S" variant="ghost" onClick={() => onChange([])}>
          Bỏ gom nhóm
        </Button>
      )}
    </Flex>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RegistrationTable({
  activityId,
  reloadKey,
}: RegistrationTableProps) {
  const { get, post, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC({
    canExport: [{ action: "plugin::event-management.export" }],
    canManageWaitlist: [{ action: "plugin::event-management.manage-waitlist" }],
    canManageRegistrations: [
      { action: "plugin::event-management.manage-registrations" },
    ],
  });

  // All registrations for the activity (fetched once, processed client-side).
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Quick filters & global search
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmedFilter, setConfirmedFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // ── Persisted per-activity view state ──
  const viewKey = `em:reg-table:view:v1:${activityId}`;
  const [view, setView] = useLocalStorage<PersistedView>(viewKey, DEFAULT_VIEW);
  const {
    visibleColumns,
    columnWidths,
    columnFilters,
    groupBy,
    sortBy,
    sortOrder,
  } = view;

  const patchView = useCallback(
    (patch: Partial<PersistedView>) =>
      setView((prev) => ({ ...prev, ...patch })),
    [setView],
  );

  const [colPickerOpen, setColPickerOpen] = useState(false);

  // Collapsed group paths (session-only, not persisted)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Shared available-fields state (used by column picker, filters, export)
  const [availableFields, setAvailableFields] = useState<FieldDescriptor[]>([]);

  // Export field picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Per-row action state
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  // Debounce search input → committed search value
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Data fetching: all rows + field list ──
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(
        `/${PLUGIN_ID}/activities/${activityId}/registrations`,
        { params: { pageSize: "100000", page: "1" } },
      );
      const result = (res as any).data;
      setAllRegistrations(result?.data ?? []);
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to load registrations",
      });
    } finally {
      setLoading(false);
    }
  }, [activityId, reloadKey]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  /** Fetches available fields once and caches in state. */
  const ensureAvailableFields = useCallback(async (): Promise<
    FieldDescriptor[] | null
  > => {
    if (availableFields.length > 0) return availableFields;
    try {
      const res = await get(
        `/${PLUGIN_ID}/activities/${activityId}/available-fields`,
      );
      const fields: FieldDescriptor[] = (res as any).data?.data ?? [];
      setAvailableFields(fields);
      return fields;
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to load field list",
      });
      return null;
    }
  }, [activityId, availableFields]);

  // Load the field list up-front (needed for labels, filters, grouping).
  useEffect(() => {
    ensureAvailableFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  // ── Client-side processing pipeline ──

  // 1) global search + quick status/confirmed filters
  const baseFiltered = useMemo(() => {
    let rows = allRegistrations;
    if (statusFilter)
      rows = rows.filter((r) => r.registrationStatus === statusFilter);
    if (statusFilter === "active" && confirmedFilter !== "") {
      const want = confirmedFilter === "true";
      rows = rows.filter((r) => r.confirmed === want);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const d = r.registreeData ?? {};
        return (
          String(d.fullName ?? "")
            .toLowerCase()
            .includes(q) ||
          String(d.phoneNumber ?? "")
            .toLowerCase()
            .includes(q) ||
          String(d.email ?? "")
            .toLowerCase()
            .includes(q)
        );
      });
    }
    return rows;
  }, [allRegistrations, statusFilter, confirmedFilter, search]);

  // Distinct values per visible column (for checklist filters + auto mode).
  const columnOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of visibleColumns) {
      map[col] = uniqueValues(baseFiltered, col);
    }
    return map;
  }, [baseFiltered, visibleColumns]);

  // 2) per-column filters
  const columnFiltered = useMemo(() => {
    const entries = Object.entries(columnFilters);
    if (entries.length === 0) return baseFiltered;
    return baseFiltered.filter((reg) =>
      entries.every(([field, values]) => {
        if (values.length === 0) return true;
        return values.includes(cellText(reg, field));
      }),
    );
  }, [baseFiltered, columnFilters]);

  // 3) sort
  const sorted = useMemo(() => {
    return [...columnFiltered].sort((a, b) =>
      compareByField(a, b, sortBy, sortOrder),
    );
  }, [columnFiltered, sortBy, sortOrder]);

  const grouping = groupBy.length > 0;

  // 4a) grouped render items (no pagination when grouping)
  const groupedItems = useMemo<RenderItem[]>(() => {
    if (!grouping) return [];
    const tree = buildGroupTree(sorted, groupBy);
    return flattenGroupTree(tree, collapsedGroups);
  }, [grouping, sorted, groupBy, collapsedGroups]);

  // 4b) paginated rows when not grouping
  const total = sorted.length;
  const totalPages = grouping ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    if (grouping) return [];
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [grouping, sorted, page]);

  // Keep page in range when the result set shrinks.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // ── Row actions ──
  const handlePromoteRow = async (registrationId: number) => {
    setPromotingId(registrationId);
    try {
      await post(`/${PLUGIN_ID}/registrations/${registrationId}/promote`, {});
      toggleNotification({
        type: "success",
        message: "Registration promoted to active.",
      });
      fetchRegistrations();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? "";
      if (msg.includes("No available slots")) {
        toggleNotification({
          type: "danger",
          message:
            "No available slots — increase the registration limit first.",
        });
      } else {
        toggleNotification({
          type: "danger",
          message: "Failed to promote registration.",
        });
      }
    } finally {
      setPromotingId(null);
    }
  };

  const handleConfirmRow = async (registrationId: number) => {
    setConfirmingId(registrationId);
    try {
      await post(`/${PLUGIN_ID}/registrations/${registrationId}/confirm`, {});
      toggleNotification({
        type: "success",
        message: "Registration confirmed.",
      });
      fetchRegistrations();
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to confirm registration.",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelRow = async (registrationId: number) => {
    setCancelingId(registrationId);
    try {
      await post(`/${PLUGIN_ID}/registrations/${registrationId}/cancel`, {});
      toggleNotification({
        type: "success",
        message: "Registration canceled.",
      });
      fetchRegistrations();
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to cancel registration.",
      });
    } finally {
      setCancelingId(null);
    }
  };

  const handleSaveNote = async (registrationId: number, note: string) => {
    try {
      await put(`/${PLUGIN_ID}/registrations/${registrationId}/note`, {
        data: { note },
      });
      setAllRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId ? { ...r, adminNote: note } : r,
        ),
      );
      toggleNotification({ type: "success", message: "Note saved." });
    } catch (err: any) {
      const detail =
        err?.response?.data?.error?.message ??
        err?.message ??
        (err?.status ? `HTTP ${err.status}` : "");
      toggleNotification({
        type: "danger",
        message: detail ? `Failed to save note: ${detail}` : "Failed to save note.",
      });
    }
  };

  function handleStatusChange(val: string | number) {
    const v = String(val ?? "");
    setStatusFilter(v);
    if (v !== "active") setConfirmedFilter("");
    setPage(1);
  }

  const handleOpenColumnPicker = async () => {
    const fields = await ensureAvailableFields();
    if (fields) setColPickerOpen(true);
  };

  const handleOpenExport = async () => {
    const fields = await ensureAvailableFields();
    if (fields) {
      setSelectedFields(fields.map((f) => f.key));
      setPickerOpen(true);
    }
  };

  const handleExportConfirm = async () => {
    setPickerOpen(false);
    if (selectedFields.length === 0) return;
    try {
      const res = await get(
        `/${PLUGIN_ID}/activities/${activityId}/export-csv`,
        { params: { fields: selectedFields.join(",") } },
      );
      const csv: string = (res as any).data?.data ?? "";
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `registrations-activity-${activityId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toggleNotification({ type: "danger", message: "Failed to export CSV" });
    }
  };

  // ── Filter / sort / group helpers ──
  function setColumnFilter(field: string, filter: ColumnFilter | undefined) {
    const next = { ...columnFilters };
    if (filter === undefined || filter.length === 0) delete next[field];
    else next[field] = filter;
    patchView({ columnFilters: next });
    setPage(1);
  }

  function clearAllFilters() {
    patchView({ columnFilters: {} });
    setPage(1);
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      patchView({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      patchView({ sortBy: field, sortOrder: "asc" });
    }
  }

  function toggleGroupCollapse(path: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  // ── Column resize (drag the right edge of a header) ──
  // Handlers are created per-drag so add/removeEventListener share the exact
  // same reference, avoiding leaked listeners across re-renders.
  function onResizeStart(e: React.MouseEvent, field: string) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = columnWidths[field] ?? DEFAULT_COL_WIDTH;
    const onMove = (ev: MouseEvent) => {
      const width = Math.max(MIN_COL_WIDTH, startW + (ev.clientX - startX));
      setView((prev) => ({
        ...prev,
        columnWidths: { ...prev.columnWidths, [field]: width },
      }));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  }

  // ── Column reorder (drag a header onto another) ──
  const dragField = useRef<string | null>(null);
  function onColDragStart(field: string) {
    dragField.current = field;
  }
  function onColDrop(targetField: string) {
    const from = dragField.current;
    dragField.current = null;
    if (!from || from === targetField) return;
    const next = [...visibleColumns];
    const fromIdx = next.indexOf(from);
    const toIdx = next.indexOf(targetField);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    patchView({ visibleColumns: next });
  }

  function renderCell(reg: Registration, field: string) {
    switch (field) {
      case "id":
        return <Typography>{reg.id}</Typography>;
      case "registrationStatus":
        return (
          <Typography textColor={statusColor(reg.registrationStatus)}>
            {reg.registrationStatus}
          </Typography>
        );
      case "confirmed":
        return <Typography>{confirmedLabel(reg.confirmed)}</Typography>;
      case "confirmationEmailSentAt": {
        const sentAt = (reg as any).confirmationEmailSentAt;
        return (
          <Typography textColor={sentAt ? "success600" : "neutral500"}>
            {sentAt
              ? new Date(sentAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—"}
          </Typography>
        );
      }
      case "firstTimeRegistered":
        return (
          <Typography>{reg.firstTimeRegistered ? "Yes" : "No"}</Typography>
        );
      case "createdAt":
        return (
          <Typography>
            {new Date(reg.createdAt).toLocaleDateString("vi-VN")}
          </Typography>
        );
    }

    if (reg.registreeData && field in reg.registreeData) {
      const val = reg.registreeData[field];
      if (typeof val === "boolean") {
        return <Typography>{val ? "Yes" : "No"}</Typography>;
      }
      return <Typography>{val ?? "—"}</Typography>;
    }

    if (field.includes("__") && reg.registrationPayload) {
      const sep = field.indexOf("__");
      const sectionKey = field.slice(0, sep);
      const fieldKey = field.slice(sep + 2);
      const section = reg.registrationPayload[sectionKey];
      if (section && fieldKey in section) {
        const val = section[fieldKey];
        return <Typography>{val != null ? String(val) : "—"}</Typography>;
      }
    }

    return <Typography>—</Typography>;
  }

  const anyActionInProgress =
    promotingId !== null || confirmingId !== null || cancelingId !== null;

  const colCount = visibleColumns.length + 2;

  function renderActionCell(reg: Registration) {
    return (
      <Flex gap={1}>
        <NoteCell reg={reg} onSave={handleSaveNote} />
        {allowedActions.canManageWaitlist &&
          reg.registrationStatus === "pending" && (
            <Button
              size="S"
              variant="secondary"
              startIcon={<ArrowUp />}
              loading={promotingId === reg.id}
              disabled={anyActionInProgress}
              onClick={() =>
                setPendingAction({
                  type: "promote",
                  registrationId: reg.id,
                  name: reg.registreeData?.fullName ?? "",
                })
              }
            >
              Promote
            </Button>
          )}
        {allowedActions.canManageRegistrations &&
          reg.registrationStatus === "active" &&
          reg.confirmed !== true && (
            <Button
              size="S"
              variant="secondary"
              startIcon={<Check />}
              loading={confirmingId === reg.id}
              disabled={anyActionInProgress}
              onClick={() =>
                setPendingAction({
                  type: "confirm",
                  registrationId: reg.id,
                  name: reg.registreeData?.fullName ?? "",
                })
              }
            >
              Confirm
            </Button>
          )}
        {allowedActions.canManageRegistrations &&
          reg.registrationStatus !== "canceled" && (
            <Button
              size="S"
              variant="danger-light"
              startIcon={<Cross />}
              loading={cancelingId === reg.id}
              disabled={anyActionInProgress}
              onClick={() =>
                setPendingAction({
                  type: "cancel",
                  registrationId: reg.id,
                  name: reg.registreeData?.fullName ?? "",
                })
              }
            >
              Cancel
            </Button>
          )}
      </Flex>
    );
  }

  function renderDataRow(reg: Registration) {
    return (
      <Tr key={reg.id}>
        <Td style={{ width: 28, textAlign: "center" }}>
          <NoteDot note={reg.adminNote} />
        </Td>
        {visibleColumns.map((col) => {
          const width = columnWidths[col] ?? DEFAULT_COL_WIDTH;
          return (
            <Td key={col} style={{ maxWidth: width }}>
              <div
                title={cellText(reg, col)}
                style={{
                  width,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {renderCell(reg, col)}
              </div>
            </Td>
          );
        })}
        <Td>{renderActionCell(reg)}</Td>
      </Tr>
    );
  }

  const hasActiveColumnFilters = Object.keys(columnFilters).length > 0;

  return (
    <Box background="neutral100" padding={5} borderRadius="4px">
      {/* ── Header row ── */}
      <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Flex direction="row" gap={5}>
          <Typography variant="beta">Registrations</Typography>
          {!loading && (
            <Typography variant="omega" textColor="neutral500">
              {total} record{total !== 1 ? "s" : ""}
            </Typography>
          )}
        </Flex>
        <Flex gap={2}>
          <Button
            variant="ghost"
            startIcon={<Cog />}
            onClick={handleOpenColumnPicker}
          >
            Columns
          </Button>
          {allowedActions.canExport && (
            <Button
              variant="secondary"
              startIcon={<Download />}
              onClick={handleOpenExport}
            >
              Export CSV
            </Button>
          )}
        </Flex>
      </Flex>

      {/* ── Search + quick filters ── */}
      <Flex gap={3} marginBottom={3} wrap="wrap">
        <TextInput
          placeholder="Search name, phone, email…"
          value={searchInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchInput(e.target.value)
          }
          style={{ minWidth: 220 }}
        />

        <SingleSelect value={statusFilter} onChange={handleStatusChange}>
          <SingleSelectOption value="">All statuses</SingleSelectOption>
          <SingleSelectOption value="active">Active</SingleSelectOption>
          <SingleSelectOption value="pending">Pending</SingleSelectOption>
          <SingleSelectOption value="canceled">Canceled</SingleSelectOption>
        </SingleSelect>

        {statusFilter === "active" && (
          <SingleSelect
            value={confirmedFilter}
            onChange={(val: string | number) => {
              setConfirmedFilter(String(val ?? ""));
              setPage(1);
            }}
          >
            <SingleSelectOption value="">All confirmed</SingleSelectOption>
            <SingleSelectOption value="true">Confirmed</SingleSelectOption>
            <SingleSelectOption value="false">Not confirmed</SingleSelectOption>
          </SingleSelect>
        )}

        {hasActiveColumnFilters && (
          <Button variant="ghost" onClick={clearAllFilters}>
            Xoá lọc
          </Button>
        )}
      </Flex>

      {/* ── Group-by panel ── */}
      <Box marginBottom={4}>
        <GroupByPanel
          groupBy={groupBy}
          visibleColumns={visibleColumns}
          availableFields={availableFields}
          onChange={(g) => patchView({ groupBy: g })}
        />
      </Box>

      {/* ── Table ── */}
      {loading ? (
        <Typography>Loading registrations…</Typography>
      ) : (
        <Box style={{ overflowX: "auto", width: "100%" }}>
          <Table colCount={colCount} rowCount={Math.max(total, 1)}>
            <Thead>
              <Tr>
                <Th style={{ width: 28 }}>
                  <Typography variant="sigma" textColor="neutral600">
                    {/* note marker column */}
                  </Typography>
                </Th>
                {visibleColumns.map((col) => {
                  const width = columnWidths[col] ?? DEFAULT_COL_WIDTH;
                  const label = fieldLabel(col, availableFields);
                  return (
                    <Th
                      key={col}
                      style={{
                        width,
                        minWidth: width,
                        maxWidth: width,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <Flex
                        gap={1}
                        alignItems="center"
                        draggable
                        onDragStart={() => onColDragStart(col)}
                        onDragOver={(e: React.DragEvent) => e.preventDefault()}
                        onDrop={() => onColDrop(col)}
                        style={{ cursor: "grab", minWidth: 0 }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          title={label}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            paddingRight: 8,
                            cursor: "pointer",
                            font: "inherit",
                            flex: 1,
                            minWidth: 0,
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "left",
                          }}
                        >
                          <Typography variant="sigma" textColor="neutral600">
                            {label}
                            {sortBy === col
                              ? sortOrder === "asc"
                                ? " ▲"
                                : " ▼"
                              : ""}
                          </Typography>
                        </button>
                      </Flex>
                      {/* resize handle */}
                      <span
                        onMouseDown={(e) => onResizeStart(e, col)}
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          height: "100%",
                          width: 6,
                          cursor: "col-resize",
                          userSelect: "none",
                        }}
                      />
                    </Th>
                  );
                })}
                <Th>
                  <Typography variant="sigma" textColor="neutral600">
                    Actions
                  </Typography>
                </Th>
              </Tr>
              {/* per-column filter row */}
              <Tr>
                <Th style={{ width: 28 }}>
                  <Box />
                </Th>
                {visibleColumns.map((col) => (
                  <Th key={col} style={{ whiteSpace: "nowrap" }}>
                    <ColumnFilterControl
                      field={col}
                      filter={columnFilters[col]}
                      options={columnOptions[col] ?? []}
                      onChange={(f) => setColumnFilter(col, f)}
                    />
                  </Th>
                ))}
                <Th>
                  <Box />
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {total === 0 ? (
                <Tr>
                  <Td colSpan={colCount}>
                    <Box padding={6} style={{ textAlign: "center" }}>
                      <Typography textColor="neutral500">
                        No registrations found.
                      </Typography>
                    </Box>
                  </Td>
                </Tr>
              ) : grouping ? (
                groupedItems.map((item) =>
                  item.type === "group" ? (
                    <Tr key={`g-${item.path}`}>
                      <Td colSpan={colCount}>
                        <Flex
                          gap={2}
                          alignItems="center"
                          style={{ paddingLeft: item.level * 24 }}
                        >
                          <IconButton
                            label={item.collapsed ? "Mở rộng" : "Thu gọn"}
                            size="S"
                            variant="ghost"
                            onClick={() => toggleGroupCollapse(item.path)}
                          >
                            {item.collapsed ? <ArrowDown /> : <ArrowUp />}
                          </IconButton>
                          <Typography variant="omega" fontWeight="bold">
                            {fieldLabel(item.field, availableFields)}:{" "}
                            {item.value === "" ? EMPTY_LABEL : item.value}
                          </Typography>
                          <Typography variant="pi" textColor="neutral500">
                            ({item.count})
                          </Typography>
                        </Flex>
                      </Td>
                    </Tr>
                  ) : (
                    renderDataRow(item.reg)
                  ),
                )
              ) : (
                pagedRows.map((reg) => renderDataRow(reg))
              )}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* ── Pagination (only when not grouping) ── */}
      {!grouping && totalPages > 1 && (
        <Flex justifyContent="center" paddingTop={4}>
          <Pagination activePage={page} pageCount={totalPages}>
            <PreviousLink onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trang trước
            </PreviousLink>
            {Array.from({ length: totalPages }, (_, i) => (
              <PageLink
                key={i + 1}
                number={i + 1}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </PageLink>
            ))}
            <NextLink
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </NextLink>
          </Pagination>
        </Flex>
      )}

      {/* ── Column picker modal ── */}
      <ColumnPickerModal
        open={colPickerOpen}
        availableFields={availableFields.filter(
          (f) => !NON_COLUMN_FIELDS.includes(f.key),
        )}
        visible={visibleColumns}
        onChange={(cols) => patchView({ visibleColumns: cols })}
        onClose={() => setColPickerOpen(false)}
      />

      {/* ── Action confirmation modal ── */}
      <ConfirmActionModal
        pending={pendingAction}
        loading={
          (pendingAction?.type === "promote" &&
            promotingId === pendingAction.registrationId) ||
          (pendingAction?.type === "confirm" &&
            confirmingId === pendingAction.registrationId) ||
          (pendingAction?.type === "cancel" &&
            cancelingId === pendingAction.registrationId)
        }
        onConfirm={async () => {
          if (!pendingAction) return;
          const { type, registrationId } = pendingAction;
          if (type === "promote") await handlePromoteRow(registrationId);
          else if (type === "confirm") await handleConfirmRow(registrationId);
          else if (type === "cancel") await handleCancelRow(registrationId);
          setPendingAction(null);
        }}
        onClose={() => setPendingAction(null)}
      />

      {/* ── Export field picker modal ── */}
      <FieldPickerModal
        open={pickerOpen}
        availableFields={availableFields}
        selectedFields={selectedFields}
        onToggle={(key) =>
          setSelectedFields((prev) =>
            prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
          )
        }
        onSelectAll={() => setSelectedFields(availableFields.map((f) => f.key))}
        onClearAll={() => setSelectedFields([])}
        onConfirm={handleExportConfirm}
        onClose={() => setPickerOpen(false)}
      />
    </Box>
  );
}
