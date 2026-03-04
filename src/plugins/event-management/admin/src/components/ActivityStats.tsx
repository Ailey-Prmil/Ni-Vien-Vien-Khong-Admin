import React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';

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

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  color?: string;
  wide?: boolean;
}

function StatCard({ label, value, color, wide }: StatCardProps) {
  return (
    <Box
      background="neutral0"
      padding={4}
      borderRadius="4px"
      shadow="filterShadow"
      style={{ minWidth: wide ? 200 : 130, textAlign: 'center' }}
    >
      {typeof value === 'number' || typeof value === 'string' ? (
        <Typography variant="alpha" textColor={color ?? 'neutral800'} as="p">
          {value}
        </Typography>
      ) : (
        <Box>{value}</Box>
      )}
      <Typography variant="pi" textColor="neutral500" style={{ marginTop: 4, display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}

function DobValue({ dob }: { dob: string | null }) {
  if (!dob) return <Typography textColor="neutral500" as="p">—</Typography>;
  return (
    <Flex direction="column" alignItems="center">
      <Typography variant="epsilon" fontWeight="bold" textColor="neutral800" as="p">
        {dob}
      </Typography>
      <Typography variant="pi" textColor="neutral500" as="p">
        ({calcAge(dob)} years old)
      </Typography>
    </Flex>
  );
}

interface ActivityStatsProps {
  stats: Stats;
}

export function ActivityStats({ stats }: ActivityStatsProps) {
  const slotsDisplay = stats.availableSlots === null ? '∞' : stats.availableSlots;

  return (
    <Box background="neutral100" padding={5} borderRadius="4px">
      <Flex gap={4} wrap="wrap">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} color="success600" />
        <StatCard label="Confirmed Active" value={stats.confirmedActive} color="success600" />
        <StatCard label="Unconfirmed Active" value={stats.unconfirmedActive} color="warning600" />
        <StatCard label="Pending (Waitlist)" value={stats.pending} color="warning600" />
        <StatCard label="Canceled" value={stats.canceled} color="danger600" />
        <StatCard
          label="Available Slots"
          value={slotsDisplay}
          color={
            stats.availableSlots !== null && stats.availableSlots === 0
              ? 'danger600'
              : 'neutral800'
          }
        />
        <StatCard
          label="Oldest Active Registree"
          value={<DobValue dob={stats.oldestActiveDob} />}
          wide
        />
        <StatCard
          label="Youngest Active Registree"
          value={<DobValue dob={stats.youngestActiveDob} />}
          wide
        />
      </Flex>
    </Box>
  );
}
