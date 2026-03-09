import type { Core } from '@strapi/strapi';

const ACTIVITY_UID = 'api::activity.activity' as const;
const REGISTRATION_UID = 'api::activity-registration.activity-registration' as const;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Mock: logs which active registrants would receive a confirmation email.
   * TODO: replace console.log with real email sending when template is ready.
   */
  async sendConfirmationEmails(
    activityId: number,
  ): Promise<{ sent: number; failed: number }> {
    const [activity, registrations] = await Promise.all([
      strapi.entityService.findOne(ACTIVITY_UID, activityId, {}),
      strapi.entityService.findMany(REGISTRATION_UID, {
        filters: {
          registeredActivity: { id: activityId },
          registrationStatus: 'active',
        },
        populate: { registreeData: true },
      }),
    ]);

    const activityName = (activity as any)?.activityName ?? '';
    let sent = 0;
    let failed = 0;

    for (const reg of registrations as any[]) {
      const email = reg.registreeData?.email;
      const fullName = reg.registreeData?.fullName;

      if (!email) {
        failed++;
        continue;
      }

      // TODO: send real confirmation email here
      strapi.log.info(
        `[event-management][mock] Would send confirmation email` +
          ` to ${fullName} <${email}> for activity "${activityName}"`,
      );
      sent++;
    }

    return { sent, failed };
  },

  /**
   * Mock: logs that a waitlist-promotion email would be sent to this registrant.
   * TODO: replace console.log with real email sending when template is ready.
   */
  async sendWaitlistPromotionEmail({
    email,
    fullName,
    activityName,
  }: {
    email: string;
    fullName?: string;
    activityName?: string;
  }): Promise<void> {
    // TODO: send real waitlist promotion email here
    strapi.log.info(
      `[event-management][mock] Would send waitlist-promotion email` +
        ` to ${fullName} <${email}> for activity "${activityName}"`,
    );
  },
});
