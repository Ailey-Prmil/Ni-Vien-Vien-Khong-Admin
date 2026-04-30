import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { ArrowLeft, ArrowClockwise } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";
import { PageLayout } from "../components/PageLayout";
import { ActivityStats, Stats } from "../components/ActivityStats";
import { RegistrationTable } from "../components/RegistrationTable";
import { SendConfirmationSection } from "../components/SendConfirmationSection";
import { WaitlistPromotionSection } from "../components/WaitlistPromotionSection";

interface Activity {
  id: number;
  activityName: string;
  activityCategory: string;
  activityStartDate: string;
  activityEndDate?: string;
  registrationLimit: number;
  ageRestricted: boolean;
  minAge?: number;
  maxAge?: number;
  publishedAt?: string | null;
}

// interface Stats {
//   total: number;
//   active: number;
//   pending: number;
//   canceled: number;
//   confirmedActive: number;
//   unconfirmedActive: number;
//   unsentActive: number;
//   registrationLimit: number;
//   availableSlots: number | null;
//   oldestActiveDob: string | null;
//   youngestActiveDob: string | null;
// }

type ActivityStatus = "Upcoming" | "Ongoing" | "Completed";

function getActivityStatus(start: string, end?: string): ActivityStatus {
  const today = new Date().toISOString().split("T")[0];
  if (start > today) return "Upcoming";
  if (!end || end >= today) return "Ongoing";
  return "Completed";
}

const STATUS_STYLES: Record<ActivityStatus, React.CSSProperties> = {
  Upcoming: { background: "#d9e8ff", color: "#0c4a6e" },
  Ongoing: { background: "#f0d7c2", color: "#775827" },
  Completed: { background: "#eaeaef", color: "#666687" },
};

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const navigate = useNavigate();
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/activities/${activityId}`);
      setActivity((res as any).data?.data ?? null);
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to load activity",
      });
    } finally {
      setLoadingActivity(false);
    }
  }, [activityId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/activities/${activityId}/stats`);
      setStats((res as any).data?.data ?? null);
    } catch {
      toggleNotification({ type: "danger", message: "Failed to load stats" });
    }
  }, [activityId]);

  useEffect(() => {
    fetchActivity();
    fetchStats();
  }, [fetchActivity, fetchStats]);

  if (loadingActivity) {
    return (
      <Box padding={8}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  if (!activity) {
    return (
      <Box padding={8}>
        <Typography>Activity not found.</Typography>
      </Box>
    );
  }

  const activityStatus = getActivityStatus(
    activity.activityStartDate,
    activity.activityEndDate,
  );
  const statusStyle = STATUS_STYLES[activityStatus];

  const dateRange = activity.activityEndDate
    ? `${activity.activityStartDate} → ${activity.activityEndDate}`
    : `Start: ${activity.activityStartDate}`;
  const limitLabel =
    activity.registrationLimit === 0
      ? "Unlimited"
      : String(activity.registrationLimit);
  const subtitleParts = [
    activity.activityCategory,
    dateRange,
    `Limit: ${limitLabel}`,
    ...(activity.ageRestricted
      ? [`Ages ${activity.minAge ?? "?"}–${activity.maxAge ?? "?"}`]
      : []),
  ];

  return (
    <PageLayout
      title={activity.activityName}
      subtitle={subtitleParts.join(" · ")}
      navigationAction={
        <Button
          variant="ghost"
          startIcon={<ArrowLeft />}
          onClick={() => navigate(`/plugins/${PLUGIN_ID}`)}
        >
          Back
        </Button>
      }
      primaryAction={
        <Flex gap={3} alignItems="center">
          <Button
            variant="secondary"
            startIcon={<ArrowClockwise />}
            onClick={() => {
              fetchStats();
              setReloadKey((k) => k + 1);
            }}
          >
            Reload
          </Button>
          <span
            style={{
              ...statusStyle,
              padding: "8px 20px",
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.5px",
            }}
          >
            {activityStatus}
          </span>
        </Flex>
      }
    >
      {/* ── Registration Statistics ── */}
      {stats && (
        <Box marginBottom={6}>
          <ActivityStats stats={stats} />
        </Box>
      )}

      {/* ── Actions ── */}
      <Flex gap={4} alignItems="flex-start" wrap="wrap">
        <Box style={{ flex: "1 1 300px" }}>
          <WaitlistPromotionSection
            activityId={activityId}
            pendingCount={stats?.pending ?? 0}
            availableSlots={stats?.availableSlots ?? null}
            onPromoted={() => {
              fetchStats();
              setReloadKey((k) => k + 1);
            }}
          />
        </Box>
        <Box
          padding={5}
          style={{
            flex: "1 1 300px",
          }}
        >
          <SendConfirmationSection
            activityId={activityId}
            activeCount={stats?.active ?? 0}
            unsentActive={stats?.unsentActive ?? 0}
            onSent={() => {
              fetchStats();
              setReloadKey((k) => k + 1);
            }}
          />
        </Box>
      </Flex>

      {/* ── Registration Table ── */}
      <Box marginBottom={6}>
        <RegistrationTable activityId={activityId} reloadKey={reloadKey} />
      </Box>
    </PageLayout>
  );
}
