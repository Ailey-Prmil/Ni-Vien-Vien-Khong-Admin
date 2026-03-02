import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Grid,
  Typography,
} from '@strapi/design-system';
import { ArrowLeft } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';
import { PageLayout } from '../components/PageLayout';
import { ActivityStats } from '../components/ActivityStats';
import { RegistrationTable } from '../components/RegistrationTable';
import { SendConfirmationSection } from '../components/SendConfirmationSection';
import { WaitlistPromotionSection } from '../components/WaitlistPromotionSection';

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

interface Stats {
  total: number;
  active: number;
  pending: number;
  canceled: number;
  confirmedActive: number;
  unconfirmedActive: number;
  registrationLimit: number;
  availableSlots: number | null;
  oldestActiveDob: string | null;
  youngestActiveDob: string | null;
}

type ActivityStatus = 'Upcoming' | 'Ongoing' | 'Completed';

function getActivityStatus(start: string, end?: string): ActivityStatus {
  const today = new Date().toISOString().split('T')[0];
  if (start > today) return 'Upcoming';
  if (!end || end >= today) return 'Ongoing';
  return 'Completed';
}

const STATUS_STYLES: Record<ActivityStatus, React.CSSProperties> = {
  Upcoming: { background: '#d9e8ff', color: '#0c4a6e' },
  Ongoing:  { background: '#c6f0c2', color: '#27772d' },
  Completed: { background: '#eaeaef', color: '#666687' },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex direction="column" gap={1}>
      <Typography variant="sigma" textColor="neutral500">
        {label}
      </Typography>
      <Typography>{value ?? '—'}</Typography>
    </Flex>
  );
}

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const navigate = useNavigate();
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/activities/${activityId}`);
      setActivity((res as any).data?.data ?? null);
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to load activity' });
    } finally {
      setLoadingActivity(false);
    }
  }, [activityId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/activities/${activityId}/stats`);
      setStats((res as any).data?.data ?? null);
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to load stats' });
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

  const activityStatus = getActivityStatus(activity.activityStartDate, activity.activityEndDate);
  const statusStyle = STATUS_STYLES[activityStatus];

  return (
    <PageLayout
      title={activity.activityName}
      subtitle={`${activity.activityCategory} · ${activity.activityStartDate}`}
      navigationAction={
        <Button
          variant="ghost"
          startIcon={<ArrowLeft />}
          onClick={() => navigate(`/plugins/${PLUGIN_ID}`)}
        >
          Back to list
        </Button>
      }
    >
      {/* ── Activity Details ── */}
      <Box background="neutral100" padding={5} borderRadius="4px" marginBottom={6}>
        <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
          <Typography variant="beta">Activity Details</Typography>
          <span
            style={{
              ...statusStyle,
              padding: '3px 12px',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.5px',
            }}
          >
            {activityStatus}
          </span>
        </Flex>

        <Grid.Root gap={4}>
          <Grid.Item col={3}>
            <DetailRow label="Category" value={activity.activityCategory} />
          </Grid.Item>
          <Grid.Item col={3}>
            <DetailRow label="Start Date" value={activity.activityStartDate} />
          </Grid.Item>
          <Grid.Item col={3}>
            <DetailRow label="End Date" value={activity.activityEndDate} />
          </Grid.Item>
          <Grid.Item col={3}>
            <DetailRow
              label="Registration Limit"
              value={activity.registrationLimit === 0 ? 'Unlimited' : activity.registrationLimit}
            />
          </Grid.Item>
          {activity.ageRestricted && (
            <Grid.Item col={3}>
              <DetailRow
                label="Age Limit"
                value={`${activity.minAge ?? '?'} → ${activity.maxAge ?? '?'} years old`}
              />
            </Grid.Item>
          )}
        </Grid.Root>
      </Box>

      {/* ── Registration Statistics ── */}
      {stats && (
        <Box marginBottom={6}>
          <ActivityStats stats={stats} />
        </Box>
      )}

      {/* ── Registration Table ── */}
      <Box marginBottom={6}>
        <RegistrationTable activityId={activityId} />
      </Box>

      {/* ── Actions (side by side) ── */}
      <Grid.Root gap={4}>
        <Grid.Item col={6}>
          <SendConfirmationSection
            activityId={activityId}
            activeCount={stats?.active ?? 0}
            onSent={fetchStats}
          />
        </Grid.Item>
        <Grid.Item col={6}>
          <WaitlistPromotionSection
            activityId={activityId}
            pendingCount={stats?.pending ?? 0}
            availableSlots={stats?.availableSlots ?? null}
            onPromoted={fetchStats}
          />
        </Grid.Item>
      </Grid.Root>
    </PageLayout>
  );
}
