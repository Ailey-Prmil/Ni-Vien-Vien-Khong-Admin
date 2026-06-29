import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ── Re-link registrations when an activity is republished ─────────────────
    // Strapi v5 publish creates a new DB row (new numeric id) for the published
    // version and cascades deletes the old published row's relation links.
    // We intercept via document service middleware on the publish action.
    (strapi as any).documents.use(async (context: any, next: () => Promise<any>) => {
      if (context.uid !== ACTIVITY_UID || context.action !== "publish") {
        return next();
      }

      const documentId = context.params?.documentId;

      // Snapshot which registration IDs are linked to ANY row of this document BEFORE publish
      let registrationIds: number[] = [];
      if (documentId) {
        try {
          const oldRows = (await strapi.db.query(ACTIVITY_UID).findMany({
            where: { documentId },
            select: ["id"],
          })) as any[];

          const oldIds = oldRows.map((r: any) => r.id);
          if (oldIds.length > 0) {
            const linked = (await strapi.db.query(REGISTRATION_UID).findMany({
              where: { registeredActivity: { id: { $in: oldIds } } },
              select: ["id"],
            })) as any[];
            registrationIds = linked.map((r: any) => r.id);
          }
        } catch (err) {
          strapi.log.error("[bootstrap] pre-publish snapshot failed:", err);
        }
      }

      // Run the actual publish
      const result = await next();

      // Re-link registrations to the new published row
      if (registrationIds.length > 0 && documentId) {
        try {
          const newPublished = (await strapi.db.query(ACTIVITY_UID).findOne({
            where: { documentId, publishedAt: { $notNull: true } },
            select: ["id"],
          })) as any;

          if (newPublished) {
            strapi.log.info(
              `[bootstrap] activity republish: re-linking ${registrationIds.length} registration(s) → new id ${newPublished.id} (documentId=${documentId})`,
            );
            for (const regId of registrationIds) {
              await strapi.db.query(REGISTRATION_UID).update({
                where: { id: regId },
                data: { registeredActivity: { set: [{ id: newPublished.id }] } },
              });
            }
          }
        } catch (err) {
          strapi.log.error(
            "[bootstrap] Failed to re-link registrations after activity republish:",
            err,
          );
        }
      }

      return result;
    });

    // Daily cron at 02:00 — auto-cancel registrations whose confirmation token has expired
    strapi.cron.add({
      cancelExpiredRegistrations: {
        task: async () => {
          try {
            const now = new Date();
            const expired = await strapi.db
              .query(REGISTRATION_UID)
              .findMany({
                where: {
                  confirmed: false,
                  registrationStatus: "active",
                  tokenExpiresAt: { $lte: now },
                  $not: { tokenExpiresAt: null },
                },
                select: ["id"],
              });

            if (expired.length === 0) return;

            for (const reg of expired as any[]) {
              await strapi.db.query(REGISTRATION_UID).update({
                where: { id: reg.id },
                data: {
                  registrationStatus: "canceled",
                  confirmationToken: null,
                  tokenExpiresAt: null,
                },
              });
            }

            strapi.log.info(
              `[cron] cancelExpiredRegistrations: canceled ${expired.length} expired registration(s).`,
            );
          } catch (err) {
            strapi.log.error(
              "[cron] cancelExpiredRegistrations failed:",
              err,
            );
          }
        },
        options: {
          rule: "0 2 * * *", // every day at 02:00
        },
      },
    });

    // Every minute — open registration forms whose scheduled open time has passed.
    // This is a single indexed query per tick (the DB filters; we only loop over
    // matching rows, normally zero). formOpenedDate is a one-shot trigger: once
    // the form is opened we clear the date so a later manual close isn't
    // immediately re-opened by the next tick.
    strapi.cron.add({
      openScheduledForms: {
        task: async () => {
          try {
            const now = new Date();
            const due = await strapi.db.query(ACTIVITY_UID).findMany({
              where: {
                formOpened: false,
                formOpenedDate: { $lte: now },
                $not: { formOpenedDate: null },
              },
              select: ["id"],
            });

            // TEMP DIAGNOSTIC — proves the tick fires and how many rows match.
            strapi.log.info(
              `[cron] openScheduledForms tick @ ${now.toISOString()} — ${due.length} due`,
            );

            if (due.length === 0) return;

            for (const act of due as any[]) {
              await strapi.db.query(ACTIVITY_UID).update({
                where: { id: act.id },
                data: { formOpened: true, formOpenedDate: null },
              });
            }

            strapi.log.info(
              `[cron] openScheduledForms: opened ${due.length} registration form(s).`,
            );
          } catch (err) {
            strapi.log.error("[cron] openScheduledForms failed:", err);
          }
        },
        options: {
          rule: "* * * * *", // every minute
        },
      },
    });

    // TEMP DIAGNOSTIC — confirms bootstrap ran and cron jobs were registered.
    strapi.log.info(
      "[bootstrap] cron jobs registered: openScheduledForms (* * * * *), cancelExpiredRegistrations (0 2 * * *)",
    );
  },
};
