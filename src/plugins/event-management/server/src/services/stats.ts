import type { Core } from '@strapi/strapi';

const ACTIVITY_UID = 'api::activity.activity' as const;
const REGISTRATION_UID = 'api::activity-registration.activity-registration' as const;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getStats(activityId: number) {
    const [activity, all] = await Promise.all([
      strapi.db.query(ACTIVITY_UID).findOne({
        where: { id: activityId },
        select: ['registrationLimit'],
      }),
      strapi.entityService.findMany(REGISTRATION_UID, {
        filters: { registeredActivity: { id: activityId } },
        fields: ['registrationStatus', 'confirmed'],
        populate: { registreeData: { fields: ['dob'] } },
      }),
    ]);

    const total = (all as any[]).length;
    const active = (all as any[]).filter((r) => r.registrationStatus === 'active').length;
    const pending = (all as any[]).filter((r) => r.registrationStatus === 'pending').length;
    const canceled = (all as any[]).filter((r) => r.registrationStatus === 'canceled').length;
    const confirmedActive = (all as any[]).filter(
      (r) => r.registrationStatus === 'active' && r.confirmed === true,
    ).length;
    const unconfirmedActive = active - confirmedActive;

    const registrationLimit = (activity as any)?.registrationLimit ?? 0;
    const availableSlots =
      registrationLimit === 0 ? null : Math.max(0, registrationLimit - active);

    // Youngest / oldest active registree by date-of-birth
    const activeDobs = (all as any[])
      .filter((r) => r.registrationStatus === 'active' && r.registreeData?.dob)
      .map((r) => r.registreeData.dob as string);

    const oldestActiveDob = activeDobs.length > 0
      ? activeDobs.reduce((min, d) => (d < min ? d : min))
      : null;
    const youngestActiveDob = activeDobs.length > 0
      ? activeDobs.reduce((max, d) => (d > max ? d : max))
      : null;

    return {
      total,
      active,
      pending,
      canceled,
      confirmedActive,
      unconfirmedActive,
      registrationLimit,
      availableSlots,
      oldestActiveDob,
      youngestActiveDob,
    };
  },
});
