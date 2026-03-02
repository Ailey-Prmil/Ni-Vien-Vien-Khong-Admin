import React, { useState } from 'react';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';

interface SendConfirmationSectionProps {
  activityId: number;
  activeCount: number;
  onSent?: () => void;
}

export function SendConfirmationSection({
  activityId,
  activeCount,
  onSent,
}: SendConfirmationSectionProps) {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await post(
        `/${PLUGIN_ID}/activities/${activityId}/send-confirmations`,
      );
      const { sent, failed } = (res as any).data?.data ?? { sent: 0, failed: 0 };
      toggleNotification({
        type: 'success',
        message: `Sent ${sent} confirmation email(s). Failed: ${failed}.`,
      });
      onSent?.();
    } catch {
      toggleNotification({
        type: 'danger',
        message: 'Failed to send confirmation emails.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box background="neutral100" padding={5} borderRadius="4px">
      <Typography variant="beta" marginBottom={3}>
        Send Confirmation Emails
      </Typography>
      <Typography marginBottom={4} textColor="neutral600">
        Send a confirmation message to all{' '}
        <strong>{activeCount}</strong> active registrant
        {activeCount !== 1 ? 's' : ''}.
      </Typography>
      <Flex>
        <Button
          onClick={handleSend}
          loading={sending}
          disabled={activeCount === 0}
        >
          Send to {activeCount} active registrant{activeCount !== 1 ? 's' : ''}
        </Button>
      </Flex>
    </Box>
  );
}
