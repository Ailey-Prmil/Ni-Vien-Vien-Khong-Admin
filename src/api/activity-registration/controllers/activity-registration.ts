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

      console.log("[Confirm] ========== CONFIRM DEBUG ==========");
      console.log("[Confirm] code received:", code);
      console.log("[Confirm] frontendUrl:", frontendUrl);

      if (!code) {
        console.log("[Confirm] ERROR: No code provided");
        return ctx.redirect(
          `${frontendUrl}?status=error&message=Missing confirmation token`,
        );
      }

      try {
        // Find the registration with this token
        console.log("[Confirm] Searching for registration with token:", code);
        const entries = await strapi.entityService.findMany(
          "api::activity-registration.activity-registration",
          {
            filters: { confirmationToken: code },
            populate: ["registeredActivity"],
            limit: 1,
          },
        );

        console.log(
          "[Confirm] Found entries:",
          JSON.stringify(entries, null, 2),
        );

        const entry = (Array.isArray(entries) ? entries[0] : entries) as any;

        if (!entry) {
          console.log("[Confirm] ERROR: No entry found with this token");
          return ctx.redirect(
            `${frontendUrl}?status=error&message=Invalid or expired confirmation token`,
          );
        }

        console.log(
          "[Confirm] Entry found - ID:",
          entry.id,
          "confirmed:",
          entry.confirmed,
        );

        if (entry.confirmed) {
          console.log("[Confirm] Already confirmed, redirecting...");
          return ctx.redirect(
            `${frontendUrl}?status=already_confirmed&name=${encodeURIComponent(entry.fullName)}`,
          );
        }

        // Update the entry to confirmed
        console.log("[Confirm] Updating entry to confirmed...");
        const updated = await strapi.entityService.update(
          "api::activity-registration.activity-registration",
          entry.id,
          {
            data: {
              confirmed: true,
              confirmationToken: null,
            },
          },
        );

        console.log(
          "[Confirm] Update result:",
          JSON.stringify(updated, null, 2),
        );

        // Redirect to frontend with success
        const activityName = entry.registeredActivity?.activityName || "";
        const redirectUrl = `${frontendUrl}?status=success&name=${encodeURIComponent(entry.fullName)}&activity=${encodeURIComponent(activityName)}`;
        console.log("[Confirm] SUCCESS! Redirecting to:", redirectUrl);
        console.log("[Confirm] =====================================");
        return ctx.redirect(redirectUrl);
      } catch (err) {
        console.log("[Confirm] ERROR caught:", err);
        strapi.log.error("Confirmation error:", err);
        return ctx.redirect(
          `${frontendUrl}?status=error&message=An error occurred during confirmation`,
        );
      }
    },
  }),
);
