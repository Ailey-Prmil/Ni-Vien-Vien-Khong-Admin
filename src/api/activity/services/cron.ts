import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

/**
 * Scheduled-task logic for activities, invoked by the cron tasks declared in
 * config/server.ts (`cron.tasks`). Kept in a service so it has a stable,
 * resolvable name (`api::activity.cron`) and can be unit-called/triggered
 * outside the scheduler if ever needed.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Open registration forms whose scheduled open time has passed.
  // Single indexed query per tick (the DB filters; we only loop over matching
  // rows, normally zero). formOpenedDate is a one-shot trigger: once the form
  // is opened we clear the date so a later manual close isn't immediately
  // re-opened by the next tick.
  async openScheduledForms() {
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

  // Auto-cancel registrations whose confirmation token has expired.
  async cancelExpiredRegistrations() {
    try {
      const now = new Date();
      const expired = await strapi.db.query(REGISTRATION_UID).findMany({
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
      strapi.log.error("[cron] cancelExpiredRegistrations failed:", err);
    }
  },
});
