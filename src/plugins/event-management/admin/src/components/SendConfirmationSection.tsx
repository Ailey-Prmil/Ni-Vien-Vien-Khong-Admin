import React, { useState } from "react";
import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useNotification, useRBAC } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

interface SendConfirmationSectionProps {
  activityId: number;
  activeCount: number;
  unsentActive: number;
  onSent?: () => void;
}

export function SendConfirmationSection({
  activityId,
  activeCount,
  unsentActive,
  onSent,
}: SendConfirmationSectionProps) {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC({
    canSendConfirmations: [{ action: "plugin::event-management.send-confirmations" }],
  });
  const [sending, setSending] = useState(false);

  if (!allowedActions.canSendConfirmations) return null;

  const handleSend = async (resend = false) => {
    setSending(true);
    try {
      const res = await post(
        `/${PLUGIN_ID}/activities/${activityId}/send-confirmations`,
        { data: { resend } },
      );
      const { sent, failed, skipped } = (res as any).data?.data ?? {
        sent: 0,
        failed: 0,
        skipped: 0,
      };
      toggleNotification({
        type: "success",
        message: `Sent ${sent} email(s)${skipped ? `, skipped ${skipped} already sent` : ""}${failed ? `, failed ${failed}` : ""}.`,
      });
      onSent?.();
    } catch {
      toggleNotification({
        type: "danger",
        message: "Failed to send confirmation emails.",
      });
    } finally {
      setSending(false);
    }
  };

  const alreadySentCount = activeCount - unsentActive;

  return (
    <Box background="white" padding={5} borderRadius="4px">
      <Flex direction="column" gap={1} marginBottom={4}>
        <Typography variant="beta" marginBottom={3}>
          Send Confirmation Emails
        </Typography>
        <Typography textColor="neutral600" marginBottom={2}>
          {unsentActive > 0 ? (
            <>
              <strong>{unsentActive}</strong> active registrant
              {unsentActive !== 1 ? "s" : ""} have not received a confirmation
              email yet.
            </>
          ) : activeCount > 0 ? (
            <>
              All <strong>{activeCount}</strong> active registrant
              {activeCount !== 1 ? "s" : ""} have already been emailed.
            </>
          ) : (
            <>No active registrants.</>
          )}
        </Typography>

        <Button
          onClick={() => handleSend(false)}
          loading={sending}
          disabled={unsentActive === 0 || sending}
        >
          Send to {unsentActive} unsent registrant
          {unsentActive !== 1 ? "s" : ""}
        </Button>

        {alreadySentCount > 0 && (
          <Box marginTop={3}>
            <Button
              variant="secondary"
              onClick={() => handleSend(true)}
              loading={sending}
              disabled={alreadySentCount === 0 || sending}
            >
              Resend to {alreadySentCount} already-emailed registrant
              {alreadySentCount !== 1 ? "s" : ""}
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
