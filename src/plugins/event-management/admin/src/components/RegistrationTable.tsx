import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Modal,
  NextLink,
  PageLink,
  Pagination,
  PreviousLink,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tooltip,
  Tr,
  Typography,
} from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { Download, Cog, ArrowUp } from "@strapi/icons";
import { PLUGIN_ID } from "../pluginId";

// ── Column definitions ────────────────────────────────────────────────────────

/** Known field-name → display-label mappings (backend field names as keys). */
const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  registrationStatus: "Status",
  confirmed: "Confirmed",
  confirmationEmailSentAt: "Email Sent",
  firstTimeRegistered: "First Timer",
  createdAt: "Registered At",
  fullName: "Full Name",
  dob: "DOB",
  gender: "Gender",
  email: "Email",
  address: "Address",
  phoneNumber: "Phone",
  haveZalo: "Have Zalo",
  zaloName: "Zalo Name",
};

/** Returns the display label for a field, falling back to the raw field name. */
function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

const DEFAULT_VISIBLE_FIELDS: string[] = [
  "id",
  "fullName",
  "registrationStatus",
  "confirmed",
  "confirmationEmailSentAt",
  "createdAt",
];
const MAX_COLUMNS = 10;
const PAGE_SIZE = 20;

// ── Data types ────────────────────────────────────────────────────────────────

interface Registration {
  id: number;
  registrationStatus: string;
  confirmed: boolean | null;
  firstTimeRegistered: boolean;
  createdAt: string;
  registreeData?: Record<string, any>;
  registrationPayload?: Record<string, Record<string, any>>;
}

interface RegistrationTableProps {
  activityId: number;
  reloadKey?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// function TruncatedCell({
//   text,
//   maxWidth = 200,
// }: {
//   text: string;
//   maxWidth?: number;
// }) {
//   return (
//     <Tooltip label={text}>
//       <span
//         style={{
//           maxWidth,
//           overflow: "hidden",
//           textOverflow: "ellipsis",
//           whiteSpace: "nowrap",
//           display: "block",
//           cursor: "default",
//         }}
//       >
//         {text}
//       </span>
//     </Tooltip>
//   );
// }

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
  availableFields: string[];
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

  function toggle(col: string) {
    setLocal((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  }

  return (
    <Modal.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="beta">
            Choose visible columns (max {MAX_COLUMNS})
          </Typography>
        </Modal.Header>
        <Modal.Body>
          <Flex wrap="wrap" gap={3}>
            {availableFields.map((col) => {
              const checked = local.includes(col);
              const disabled = !checked && local.length >= MAX_COLUMNS;
              return (
                <Box key={col} style={{ minWidth: 160 }}>
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => !disabled && toggle(col)}
                  >
                    {fieldLabel(col)}
                  </Checkbox>
                </Box>
              );
            })}
          </Flex>
          {local.length >= MAX_COLUMNS && (
            <Typography
              variant="pi"
              textColor="neutral500"
              style={{ marginTop: 12 }}
            >
              Maximum {MAX_COLUMNS} columns selected. Deselect one to enable
              others.
            </Typography>
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
  availableFields: string[];
  selectedFields: string[];
  onToggle: (field: string) => void;
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
              <Box key={field} style={{ minWidth: 200 }}>
                <Checkbox
                  checked={selectedFields.includes(field)}
                  onCheckedChange={() => onToggle(field)}
                >
                  {field}
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

// ── Main component ────────────────────────────────────────────────────────────

export function RegistrationTable({ activityId, reloadKey }: RegistrationTableProps) {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmedFilter, setConfirmedFilter] = useState("");
  const [sortBy, setSortBy] = useState("registeredAt");
  const [sortOrder, setSortOrder] = useState("asc");

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_VISIBLE_FIELDS,
  );
  const [colPickerOpen, setColPickerOpen] = useState(false);

  // Shared available-fields state (used by both column picker and export)
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Export field picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Per-row promoting state
  const [promotingId, setPromotingId] = useState<number | null>(null);

  const handlePromoteRow = async (registrationId: number) => {
    setPromotingId(registrationId);
    try {
      await post(`/${PLUGIN_ID}/registrations/${registrationId}/promote`, {});
      toggleNotification({ type: "success", message: "Registration promoted to active." });
      fetchRegistrations();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? "";
      if (msg.includes("No available slots")) {
        toggleNotification({ type: "danger", message: "No available slots — increase the registration limit first." });
      } else {
        toggleNotification({ type: "danger", message: "Failed to promote registration." });
      }
    } finally {
      setPromotingId(null);
    }
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        sortBy,
        sortOrder,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      if (statusFilter) params.status = statusFilter;
      if (statusFilter === "active" && confirmedFilter !== "")
        params.confirmed = confirmedFilter;

      const res = await get(
        `/${PLUGIN_ID}/activities/${activityId}/registrations`,
        { params },
      );
      const result = (res as any).data;
      setRegistrations(result?.data ?? []);
      setTotalPages(result?.meta?.pagination?.pageCount ?? 1);
      setTotal(result?.meta?.pagination?.total ?? 0);
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to load registrations",
      });
    } finally {
      setLoading(false);
    }
  }, [activityId, statusFilter, confirmedFilter, sortBy, sortOrder, page, reloadKey]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  /** Fetches available fields from the backend (once) and caches in state. */
  async function ensureAvailableFields(): Promise<string[] | null> {
    if (availableFields.length > 0) return availableFields;
    setLoadingFields(true);
    try {
      const res = await get(
        `/${PLUGIN_ID}/activities/${activityId}/available-fields`,
      );
      const fields: string[] = (res as any).data?.data ?? [];
      setAvailableFields(fields);
      return fields;
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to load field list",
      });
      return null;
    } finally {
      setLoadingFields(false);
    }
  }

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
      setSelectedFields(fields);
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
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
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

  function renderCell(reg: Registration, field: string) {
    // Fixed meta fields with special rendering
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
              ? new Date(sentAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
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

    // registreeData fields
    if (reg.registreeData && field in reg.registreeData) {
      const val = reg.registreeData[field];
      // if (field === "fullName" || field === "email") {
      //   return <TruncatedCell text={val ?? "—"} />;
      // }
      if (typeof val === "boolean") {
        return <Typography>{val ? "Yes" : "No"}</Typography>;
      }
      return <Typography>{val ?? "—"}</Typography>;
    }

    // registrationPayload fields — search through each section's keys
    if (reg.registrationPayload) {
      for (const section of Object.values(reg.registrationPayload)) {
        if (section && typeof section === "object" && field in section) {
          const val = section[field];
          return <Typography>{val != null ? String(val) : "—"}</Typography>;
        }
      }
    }

    return <Typography>—</Typography>;
  }

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
            loading={loadingFields}
          >
            Columns
          </Button>
          <Button
            variant="secondary"
            startIcon={<Download />}
            onClick={handleOpenExport}
            loading={loadingFields}
          >
            Export CSV
          </Button>
        </Flex>
      </Flex>

      {/* ── Filters ── */}
      <Flex gap={3} marginBottom={4} wrap="wrap">
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

        <SingleSelect
          value={sortBy}
          onChange={(val: string | number) => {
            setSortBy(String(val ?? "registeredAt"));
            setPage(1);
          }}
        >
          <SingleSelectOption value="id">Sort by ID</SingleSelectOption>
          <SingleSelectOption value="fullName">
            Sort by Full Name
          </SingleSelectOption>
          <SingleSelectOption value="dob">Sort by DOB</SingleSelectOption>
          <SingleSelectOption value="registeredAt">
            Sort by Registered At
          </SingleSelectOption>
        </SingleSelect>

        <SingleSelect
          value={sortOrder}
          onChange={(val: string | number) => {
            setSortOrder(String(val ?? "asc"));
            setPage(1);
          }}
        >
          <SingleSelectOption value="asc">Ascending</SingleSelectOption>
          <SingleSelectOption value="desc">Descending</SingleSelectOption>
        </SingleSelect>
      </Flex>

      {/* ── Table ── */}
      {loading ? (
        <Typography>Loading registrations…</Typography>
      ) : registrations.length === 0 ? (
        <Box padding={6} style={{ textAlign: "center" }}>
          <Typography>No registrations found.</Typography>
        </Box>
      ) : (
        <Table colCount={visibleColumns.length + 1} rowCount={registrations.length}>
          <Thead>
            <Tr>
              {visibleColumns.map((col) => (
                <Th key={col}>
                  <Typography variant="sigma">{fieldLabel(col)}</Typography>
                </Th>
              ))}
              <Th>
                <Typography variant="sigma">Actions</Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {registrations.map((reg) => (
              <Tr key={reg.id}>
                {visibleColumns.map((col) => (
                  <Td key={col}>{renderCell(reg, col)}</Td>
                ))}
                <Td>
                  {reg.registrationStatus === "pending" && (
                    <Button
                      size="S"
                      variant="secondary"
                      startIcon={<ArrowUp />}
                      loading={promotingId === reg.id}
                      disabled={promotingId !== null}
                      onClick={() => handlePromoteRow(reg.id)}
                    >
                      Promote
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Flex justifyContent="center" paddingTop={4}>
          <Pagination activePage={page} pageCount={totalPages}>
            <PreviousLink onClick={() => setPage((p) => Math.max(1, p - 1))} />
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
            />
          </Pagination>
        </Flex>
      )}

      {/* ── Column picker modal ── */}
      <ColumnPickerModal
        open={colPickerOpen}
        availableFields={availableFields}
        visible={visibleColumns}
        onChange={setVisibleColumns}
        onClose={() => setColPickerOpen(false)}
      />

      {/* ── Export field picker modal ── */}
      <FieldPickerModal
        open={pickerOpen}
        availableFields={availableFields}
        selectedFields={selectedFields}
        onToggle={(f) =>
          setSelectedFields((prev) =>
            prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
          )
        }
        onSelectAll={() => setSelectedFields([...availableFields])}
        onClearAll={() => setSelectedFields([])}
        onConfirm={handleExportConfirm}
        onClose={() => setPickerOpen(false)}
      />
    </Box>
  );
}
