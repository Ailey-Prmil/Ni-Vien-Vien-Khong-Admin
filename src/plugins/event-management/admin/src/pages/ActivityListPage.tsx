import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Flex,
  MultiSelect,
  MultiSelectOption,
  NextLink,
  PageLink,
  Pagination,
  PreviousLink,
  Searchbar,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";
import { PageLayout } from "../components/PageLayout";

const CATEGORIES = [
  "Phật Sự Trong Nước",
  "Phật Sự Nước Ngoài",
  "Lớp Học Phật Pháp",
  "Tin Tức Khác",
  "Khóa Tu",
];

const PAGE_SIZE = 10;

interface Activity {
  id: number;
  activityName: string;
  activityCategory: string;
  activityStartDate: string;
  activityEndDate?: string;
  registrationLimit: number;
  publishedAt?: string | null;
}

function isUpcoming(activity: Activity): boolean {
  const today = new Date().toISOString().split("T")[0];
  if (activity.activityEndDate) return activity.activityEndDate >= today;
  return activity.activityStartDate >= today;
}

export function ActivityListPage() {
  const navigate = useNavigate();
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("activityStartDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await get(`/${PLUGIN_ID}/activities`);
        setActivities((res as any).data?.data ?? []);
      } catch {
        toggleNotification({
          type: "danger",
          message: "Failed to load activities",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const processedActivities = useMemo(() => {
    let result = activities;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((a) => a.activityName.toLowerCase().includes(q));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((a) =>
        selectedCategories.includes(a.activityCategory),
      );
    }

    return [...result].sort((a, b) => {
      const aVal = String((a as any)[sortBy] ?? "");
      const bVal = String((b as any)[sortBy] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [activities, search, selectedCategories, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedActivities.length / PAGE_SIZE);
  const paginatedActivities = processedActivities.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <PageLayout
      title="Event Management"
      subtitle="Manage activity registrations"
    >
      {/* ── Toolbar ── */}
      <Flex gap={3} marginBottom={6} wrap="wrap">
        <Box style={{ flex: "1 1 220px" }}>
          <Searchbar
            name="search"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setPage(1);
            }}
            clearLabel="Clear search"
            placeholder="Search by activity name"
          >
            Search
          </Searchbar>
        </Box>

        <MultiSelect
          value={selectedCategories}
          onChange={(vals: string[]) => {
            setSelectedCategories(vals);
            setPage(1);
          }}
          placeholder="All categories"
          withTags
        >
          {CATEGORIES.map((c) => (
            <MultiSelectOption key={c} value={c}>
              {c}
            </MultiSelectOption>
          ))}
        </MultiSelect>

        <SingleSelect
          value={sortBy}
          onChange={(val: string | number) => {
            setSortBy(String(val ?? "activityStartDate"));
            setPage(1);
          }}
        >
          <SingleSelectOption value="activityStartDate">
            Sort by Date
          </SingleSelectOption>
          <SingleSelectOption value="activityName">
            Sort by Name
          </SingleSelectOption>
          <SingleSelectOption value="activityCategory">
            Sort by Category
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

      {/* ── Content ── */}
      {loading && <Typography>Loading activities…</Typography>}

      {!loading && processedActivities.length === 0 && (
        <Box padding={8} style={{ textAlign: "center" }}>
          <Typography>No activities found.</Typography>
        </Box>
      )}

      {!loading && processedActivities.length > 0 && (
        <>
          <Table colCount={6} rowCount={paginatedActivities.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">Activity Name</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Category</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Start Date</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">End Date</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Slot Limit</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Actions</Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedActivities.map((activity) => (
                <Tr key={activity.id}>
                  <Td>
                    <Flex gap={2} alignItems="center">
                      <Typography fontWeight="bold">
                        {activity.activityName}
                      </Typography>
                      {isUpcoming(activity) && <Badge active>Upcoming</Badge>}
                    </Flex>
                  </Td>
                  <Td>
                    <Typography>{activity.activityCategory}</Typography>
                  </Td>
                  <Td>
                    <Typography>{activity.activityStartDate}</Typography>
                  </Td>
                  <Td>
                    <Typography>{activity.activityEndDate ?? "—"}</Typography>
                  </Td>
                  <Td>
                    <Typography>
                      {activity.registrationLimit === 0
                        ? "Unlimited"
                        : activity.registrationLimit}
                    </Typography>
                  </Td>
                  <Td>
                    <Button
                      size="S"
                      variant="secondary"
                      onClick={() => navigate(`activity/${activity.id}`)}
                    >
                      View Details
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {totalPages > 1 && (
            <Flex justifyContent="center" paddingTop={4}>
              <Pagination activePage={page} pageCount={totalPages}>
                <PreviousLink
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
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
        </>
      )}
    </PageLayout>
  );
}
