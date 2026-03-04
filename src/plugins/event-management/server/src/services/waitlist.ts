import type { Core } from '@strapi/strapi';

const ACTIVITY_UID = 'api::activity.activity' as const;
const REGISTRATION_UID = 'api::activity-registration.activity-registration' as const;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Promote the oldest `count` pending (waitlist) registrations to active.
   * FIFO order (earliest created first). Admin may request any count —
   * capacity validation and over-promotion warnings are handled on the frontend.
   * Sends a mock notification email to each promoted registrant.
   */
  async promoteWaitlist(
    activityId: number,
    count: number,
  ): Promise<{ promoted: number }> {
    const pendingRegs = await strapi.entityService.findMany(REGISTRATION_UID, {
      filters: {
        registeredActivity: { id: activityId },
        registrationStatus: 'pending',
      },
      sort: { createdAt: 'asc' }, // FIFO
      limit: count,
      populate: { registreeData: true },
    });

    const activity = await strapi.entityService.findOne(ACTIVITY_UID, activityId, {});
    const activityName = (activity as any)?.activityName ?? '';
    const notificationsService = strapi
      .plugin('event-management')
      .service('notifications');

    let promoted = 0;

    for (const reg of pendingRegs as any[]) {
      await strapi.entityService.update(REGISTRATION_UID, reg.id, {
        data: { registrationStatus: 'active' },
      });

      const email = reg.registreeData?.email;
      const fullName = reg.registreeData?.fullName;

      if (email) {
        try {
          await notificationsService.sendWaitlistPromotionEmail({
            email,
            fullName,
            activityName,
          });
        } catch (err) {
          strapi.log.error(
            `[event-management] Failed to notify ${email} after promotion:`,
            err,
          );
        }
      }

      promoted++;
    }

    return { promoted };
  },
});
