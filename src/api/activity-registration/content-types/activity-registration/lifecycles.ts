import { randomUUID } from "crypto";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

export default {
  async beforeCreate(event) {
    const { data } = event.params;

    // Always generate a fresh token and start unconfirmed
    if (!data.confirmationToken) {
      data.confirmationToken = randomUUID();
    }
    data.confirmed = false;

    // ── Determine registrationStatus based on capacity + category rules ──
    // Strapi v5 sends relation as { set: [{ id: N }] } from the REST API
    const activityId =
      data.registeredActivity?.connect?.[0]?.id ??
      data.registeredActivity?.set?.[0]?.id ??
      data.registeredActivity?.id ??
      (typeof data.registeredActivity === "number" ? data.registeredActivity : undefined);

    if (!activityId) {
      // No activity linked — fall back to schema default
      return;
    }

    const activity = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id: activityId },
      select: ["registrationLimit", "activityCategory"],
    });

    if (!activity) return;

    const { registrationLimit, activityCategory } = activity as any;

    // Rule 1 — Khóa Tu: non-first-timers always go to pending
    if (activityCategory === "Khóa Tu" && data.firstTimeRegistered === false) {
      data.registrationStatus = "pending";
      return;
    }

    // Rule 2 — Capacity check (registrationLimit = 0 means unlimited)
    if (registrationLimit > 0) {
      const activeRegs = await strapi.db.query(REGISTRATION_UID).findMany({
        where: { registrationStatus: "active" },
        populate: { registeredActivity: true },
      });
      const activeCount = (activeRegs as any[]).filter(
        (r) => r.registeredActivity?.id === activityId,
      ).length;

      strapi.log.info(
        `[lifecycle] activity=${activityId} limit=${registrationLimit} activeCount=${activeCount}`,
      );

      if (activeCount >= registrationLimit) {
        data.registrationStatus = "pending";
        return;
      }
    }

    // Default — slot available
    data.registrationStatus = "active";
  },
};
