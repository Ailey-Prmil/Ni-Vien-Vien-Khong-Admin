import type { Core } from '@strapi/strapi';

const ACTIVITY_UID = 'api::activity.activity' as const;
const REGISTRATION_UID = 'api::activity-registration.activity-registration' as const;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Promote the oldest `count` pending (waitlist) registrations to active (FIFO).
   * After promoting, sends a real confirmation email with a fresh token to each.
   */
  async promoteWaitlist(
    activityId: number,
    count: number,
  ): Promise<{ promoted: number }> {
    const pendingRegs = await strapi.db.query(REGISTRATION_UID).findMany({
      where: {
        registeredActivity: { id: activityId },
        registrationStatus: 'pending',
      },
      orderBy: { createdAt: 'asc' }, // FIFO
      limit: count,
      populate: { registreeData: true },
    });

    const activity = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id: activityId },
      select: ['activityName', 'zaloGroup'],
    });

    const activityName = (activity as any)?.activityName ?? '';
    const notificationsService = strapi
      .plugin('event-management')
      .service('notifications');

    let promoted = 0;

    for (const reg of pendingRegs as any[]) {
      // 1. Change status pending → active
      await strapi.db.query(REGISTRATION_UID).update({
        where: { id: reg.id },
        data: { registrationStatus: 'active' },
      });

      // 2. Send confirmation email with fresh token
      const email = reg.registreeData?.email;
      const fullName = reg.registreeData?.fullName;

      if (email) {
        try {
          await notificationsService.sendWaitlistPromotionEmail({
            registrationId: reg.id,
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
