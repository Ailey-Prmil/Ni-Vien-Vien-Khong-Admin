/**
 * activity-registration controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::activity-registration.activity-registration",
  ({ strapi }) => ({
    async confirm(ctx) {
      const { code } = ctx.query;
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      if (!code) {
        return ctx.redirect(
          `${frontendUrl}?status=error&message=Missing confirmation token`,
        );
      }

      try {
        const entries = await strapi.db
          .query("api::activity-registration.activity-registration")
          .findMany({
            where: { confirmationToken: code },
            populate: { registeredActivity: true, registreeData: true },
            limit: 1,
          });

        const entry = entries[0] as any;

        if (!entry) {
          return ctx.redirect(
            `${frontendUrl}?status=error&message=Invalid or expired confirmation token`,
          );
        }

        const fullName =
          entry.registreeData?.fullName ?? entry.fullName ?? "";

        if (entry.confirmed) {
          return ctx.redirect(
            `${frontendUrl}?status=already_confirmed&name=${encodeURIComponent(fullName)}`,
          );
        }

        // Check token expiry
        if (
          entry.tokenExpiresAt &&
          new Date() > new Date(entry.tokenExpiresAt)
        ) {
          await strapi.db
            .query("api::activity-registration.activity-registration")
            .update({
              where: { id: entry.id },
              data: {
                registrationStatus: "canceled",
                confirmationToken: null,
                tokenExpiresAt: null,
              },
            });
          return ctx.redirect(`${frontendUrl}?status=expired`);
        }

        // Confirm the registration
        await strapi.db
          .query("api::activity-registration.activity-registration")
          .update({
            where: { id: entry.id },
            data: {
              confirmed: true,
              confirmationToken: null,
              tokenExpiresAt: null,
            },
          });

        const activityName = entry.registeredActivity?.activityName ?? "";
        const zaloGroup = entry.registeredActivity?.zaloGroup ?? "";

        const redirectUrl =
          `${frontendUrl}?status=success` +
          `&name=${encodeURIComponent(fullName)}` +
          `&activity=${encodeURIComponent(activityName)}` +
          (zaloGroup ? `&zaloGroup=${encodeURIComponent(zaloGroup)}` : "");

        return ctx.redirect(redirectUrl);
      } catch (err) {
        strapi.log.error("Confirmation error:", err);
        return ctx.redirect(
          `${frontendUrl}?status=error&message=An error occurred during confirmation`,
        );
      }
    },
  }),
);
