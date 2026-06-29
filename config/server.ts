export default ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: {
    keys: env.array("APP_KEYS"),
  },
  cron: {
    enabled: true,
    tasks: {
      "0 2 * * *": ({ strapi }) =>
        strapi.service("api::activity.cron").cancelExpiredRegistrations(),
      "* * * * *": ({ strapi }) =>
        strapi.service("api::activity.cron").openScheduledForms(),
    },
  },
});
