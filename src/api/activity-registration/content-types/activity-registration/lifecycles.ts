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
    let activityId =
      data.registeredActivity?.connect?.[0]?.id ??
      data.registeredActivity?.set?.[0]?.id ??
      data.registeredActivity?.id ??
      (typeof data.registeredActivity === "number"
        ? data.registeredActivity
        : undefined);

    if (!activityId) {
      // No activity linked — fall back to schema default
      return;
    }

    // ── Anchor the registration to the STABLE draft row ──────────────────────
    // In Strapi v5, draft and published versions of an activity are separate DB
    // rows sharing a documentId. The published row is deleted/recreated on every
    // publish & unpublish, which would orphan registrations linked to it. The
    // draft row is never deleted across publish/unpublish cycles, so we always
    // anchor registrations to it. Admin queries aggregate across all rows of the
    // document (getAllRowIds), so this is transparent to the UI.
    const incoming = (await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id: activityId },
      select: ["id", "documentId", "locale", "publishedAt"],
    })) as any;

    if (incoming?.documentId) {
      const draft =
        ((await strapi.db.query(ACTIVITY_UID).findOne({
          where: {
            documentId: incoming.documentId,
            publishedAt: null,
            ...(incoming.locale ? { locale: incoming.locale } : {}),
          },
          select: ["id"],
        })) as any) ??
        ((await strapi.db.query(ACTIVITY_UID).findOne({
          where: { documentId: incoming.documentId, publishedAt: null },
          select: ["id"],
        })) as any);

      if (draft?.id && draft.id !== activityId) {
        activityId = draft.id;
        data.registeredActivity = { set: [{ id: activityId }] };
      }
    }

    const activity = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id: activityId },
      select: ["registrationLimit"],
    });

    if (!activity) return;

    const { registrationLimit } = activity as any;

    // Rule 1 — Khóa Tu: non-first-timers always go to pending
    if (data.firstTimeRegistered === false) {
      data.registrationStatus = "pending";
      return;
    }

    // Rule 2 — Capacity check (registrationLimit = 0 means unlimited)
    if (registrationLimit > 0) {
      await strapi.db.transaction(async () => {
        // Lock the activity row to prevent concurrent registrations from
        // reading a stale count and both slipping under the limit
        await strapi.db
          .getConnection("activities")
          .where({ id: activityId })
          .forUpdate();

        const activeCount = await strapi.db.query(REGISTRATION_UID).count({
          where: {
            registrationStatus: "active",
            registeredActivity: { id: activityId },
          },
        });

        strapi.log.info(
          `[lifecycle] activity=${activityId} limit=${registrationLimit} activeCount=${activeCount}`,
        );

        if (activeCount >= registrationLimit) {
          data.registrationStatus = "pending";
        } else {
          data.registrationStatus = "active";
        }
      });
      return;
    }

    // Default — slot available
    data.registrationStatus = "active";
  },
};
