/**
 * activity controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::activity.activity",
  ({ strapi }) => ({
    /**
     * External cron trigger. Strapi's in-process node-schedule timer does not
     * run in the Strapi Cloud production runtime, so scheduled work is driven
     * by an external scheduler (e.g. cron-job.org) hitting this endpoint.
     *
     *   POST /api/activities/cron/open-forms       (every minute)
     *   POST /api/activities/cron/cancel-expired   (daily)
     *
     * Protected by a shared secret in the `x-cron-secret` header (or `?key=`),
     * compared to env CRON_TRIGGER_SECRET, since the route is unauthenticated.
     */
    async runCron(ctx) {
      const secret = process.env.CRON_TRIGGER_SECRET;
      const provided =
        ctx.request.headers["x-cron-secret"] ?? ctx.query.key;

      if (!secret || provided !== secret) {
        return ctx.forbidden("Invalid or missing cron secret.");
      }

      const job = ctx.params.job as string;
      const cron = strapi.service("api::activity.cron");

      switch (job) {
        case "open-forms":
          return { job, ...(await cron.openScheduledForms()) };
        case "cancel-expired":
          return { job, ...(await cron.cancelExpiredRegistrations()) };
        default:
          return ctx.badRequest(
            `Unknown cron job "${job}". Use "open-forms" or "cancel-expired".`,
          );
      }
    },
  }),
);
