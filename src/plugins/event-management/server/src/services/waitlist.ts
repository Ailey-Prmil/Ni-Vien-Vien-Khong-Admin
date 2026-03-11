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
    const activity = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id: activityId },
      select: ['activityName', 'zaloGroup', 'registrationLimit'],
    });

    // Enforce capacity: cap count to available slots
    const registrationLimit = (activity as any)?.registrationLimit ?? 0;
    if (registrationLimit > 0) {
      const activeCount = await strapi.db.query(REGISTRATION_UID).count({
        where: {
          registeredActivity: { id: activityId },
          registrationStatus: 'active',
        },
      });
      const availableSlots = Math.max(0, registrationLimit - activeCount);
      if (availableSlots === 0) {
        return { promoted: 0 };
      }
      count = Math.min(count, availableSlots);
    }

    const pendingRegs = await strapi.db.query(REGISTRATION_UID).findMany({
      where: {
        registeredActivity: { id: activityId },
        registrationStatus: 'pending',
      },
      orderBy: { createdAt: 'asc' }, // FIFO
      limit: count,
      populate: { registreeData: true },
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

  /**
   * Promote a single specific registration by ID (admin manual override).
   * Returns null if the registration doesn't exist or isn't pending.
   */
  async promoteRegistration(
    registrationId: number,
  ): Promise<{ promoted: true; registrationId: number } | { error: 'not_found' | 'no_slots' }> {
    const reg = await strapi.db.query(REGISTRATION_UID).findOne({
      where: { id: registrationId, registrationStatus: 'pending' },
      populate: { registreeData: true, registeredActivity: true },
    });

    if (!reg) return { error: 'not_found' };

    // Check capacity
    const activityId = (reg as any).registeredActivity?.id;
    if (activityId) {
      const activity = await strapi.db.query(ACTIVITY_UID).findOne({
        where: { id: activityId },
        select: ['registrationLimit'],
      });
      const registrationLimit = (activity as any)?.registrationLimit ?? 0;
      if (registrationLimit > 0) {
        const activeCount = await strapi.db.query(REGISTRATION_UID).count({
          where: { registeredActivity: { id: activityId }, registrationStatus: 'active' },
        });
        if (activeCount >= registrationLimit) return { error: 'no_slots' };
      }
    }

    await strapi.db.query(REGISTRATION_UID).update({
      where: { id: registrationId },
      data: { registrationStatus: 'active' },
    });

    const activityName = (reg as any).registeredActivity?.activityName ?? '';
    const email = (reg as any).registreeData?.email;
    const fullName = (reg as any).registreeData?.fullName;

    if (email) {
      try {
        const notificationsService = strapi
          .plugin('event-management')
          .service('notifications');
        await notificationsService.sendWaitlistPromotionEmail({
          registrationId,
          email,
          fullName,
          activityName,
        });
      } catch (err) {
        strapi.log.error(
          `[event-management] Failed to notify ${email} after manual promotion:`,
          err,
        );
      }
    }

    return { promoted: true, registrationId } as { promoted: true; registrationId: number };
  },
});
