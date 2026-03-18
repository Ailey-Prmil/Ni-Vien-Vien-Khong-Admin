import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  NumberInput,
  Typography,
} from "@strapi/design-system";
import { useFetchClient, useNotification, useRBAC } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

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
  const { allowedActions } = useRBAC({
    canManageWaitlist: [{ action: "plugin::event-management.manage-waitlist" }],
  });
  const [count, setCount] = useState<number>(1);
  const [promoting, setPromoting] = useState(false);

  if (!allowedActions.canManageWaitlist) return null;

  const noSlotsAvailable = availableSlots !== null && availableSlots === 0;
  const isOverCapacity = availableSlots !== null && availableSlots > 0 && count > availableSlots;

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
        type: "success",
        message: `Promoted ${promoted} registrant(s) from the waitlist.`,
      });
      onPromoted?.();
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to promote from waitlist.",
      });
    } finally {
      setPromoting(false);
    }
  };

  const slotsLabel = availableSlots === null ? "∞" : String(availableSlots);

  return (
    <Box background="neutral100" padding={5} borderRadius="4px">
      <Flex direction="column" gap={1} marginBottom={4}>
        <Typography variant="beta">Promote from Waitlist</Typography>
        <Typography variant="pi" textColor="neutral500">
          Move registrants from the waitlist to confirmed status.
        </Typography>
      </Flex>

      {/* <Flex gap={6} marginBottom={4}>
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
      </Flex> */}

      <Flex gap={4} alignItems="flex-end" wrap="wrap">
        <Box style={{ flex: "1 0 200px", maxWidth: "80%" }}>
          <NumberInput
            value={count}
            onValueChange={(val: number | undefined) =>
              setCount(Math.max(1, val ?? 1))
            }
            min={1}
            disabled={pendingCount === 0}
          />
        </Box>
        <Button
          onClick={handlePromote}
          loading={promoting}
          disabled={pendingCount === 0 || count < 1 || noSlotsAvailable}
        >
          Promote {count} from waitlist
        </Button>
      </Flex>

      {noSlotsAvailable && (
        <Box
          background="danger100"
          padding={3}
          borderRadius="4px"
          marginTop={4}
        >
          <Typography textColor="danger700">
            No slots available. Increase the registration limit before promoting
            from the waitlist.
          </Typography>
        </Box>
      )}

      {isOverCapacity && (
        <Box
          background="warning100"
          padding={3}
          borderRadius="4px"
          marginTop={4}
        >
          <Typography textColor="warning700">
            Warning: You are promoting {count} registrant(s) but only{" "}
            {availableSlots} slot(s) are currently available. The activity will
            be over capacity.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
