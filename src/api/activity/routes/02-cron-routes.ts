/**
 * Public (secret-protected) endpoint for an EXTERNAL scheduler to trigger
 * activity cron work. In-process node-schedule does not run on Strapi Cloud,
 * so an external service (e.g. cron-job.org) POSTs here on a schedule.
 * Auth is disabled; the controller enforces the CRON_TRIGGER_SECRET header.
 */
export default {
  routes: [
    {
      method: "POST",
      path: "/activities/cron/:job",
      handler: "activity.runCron",
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
