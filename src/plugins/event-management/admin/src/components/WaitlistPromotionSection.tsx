import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  NumberInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';

interface WaitlistPromotionSectionProps {
  activityId: number;
  pendingCount: number;
  availableSlots: number | null; // null = unlimited
  onPromoted?: () => void;
}

export function WaitlistPromotionSection({
  activityId,
  pendingCount,
  availableSlots,
  onPromoted,
}: WaitlistPromotionSectionProps) {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [count, setCount] = useState<number>(1);
  const [promoting, setPromoting] = useState(false);

  const isOverCapacity =
    availableSlots !== null && count > availableSlots;

  const handlePromote = async () => {
    if (count < 1) return;

    setPromoting(true);
    try {
      const res = await post(
        `/${PLUGIN_ID}/activities/${activityId}/promote-waitlist`,
        { data: { count } },
      );
      const { promoted } = (res as any).data?.data ?? { promoted: 0 };
      toggleNotification({
        type: 'success',
        message: `Promoted ${promoted} registrant(s) from the waitlist.`,
      });
      onPromoted?.();
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to promote from waitlist.',
      });
    } finally {
      setPromoting(false);
    }
  };

  const slotsLabel =
    availableSlots === null ? '∞' : String(availableSlots);

  return (
    <Box background="neutral100" padding={5} borderRadius="4px">
      <Typography variant="beta" marginBottom={3}>
        Promote from Waitlist
      </Typography>

      <Flex gap={6} marginBottom={4}>
        <Flex direction="column" gap={1}>
          <Typography variant="sigma" textColor="neutral500">
            Pending (waitlist)
          </Typography>
          <Typography fontWeight="bold">{pendingCount}</Typography>
        </Flex>
        <Flex direction="column" gap={1}>
          <Typography variant="sigma" textColor="neutral500">
            Available slots
          </Typography>
          <Typography fontWeight="bold">{slotsLabel}</Typography>
        </Flex>
      </Flex>

      <Flex gap={4} alignItems="flex-end" wrap="wrap">
        <Box style={{ width: 200 }}>
          <NumberInput
            label="How many to promote"
            value={count}
            onValueChange={(val: number | undefined) => setCount(Math.max(1, val ?? 1))}
            min={1}
            max={pendingCount}
            disabled={pendingCount === 0}
          />
        </Box>
        <Button
          onClick={handlePromote}
          loading={promoting}
          disabled={pendingCount === 0 || count < 1}
        >
          Promote {count} from waitlist
        </Button>
      </Flex>

      {/* Over-capacity warning shown on the frontend */}
      {isOverCapacity && (
        <Box
          background="warning100"
          padding={3}
          borderRadius="4px"
          marginTop={4}
        >
          <Typography textColor="warning700">
            Warning: You are promoting {count} registrant(s) but only{' '}
            {availableSlots} slot(s) are currently available. The activity
            will be over capacity.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
