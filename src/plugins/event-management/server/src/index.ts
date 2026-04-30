import controllers from "./controllers";
import routes from "./routes";
import services from "./services";

export default {
  register({ strapi }: { strapi: any }) {
    strapi.service("admin::permission").actionProvider.registerMany([
      {
        section: "plugins",
        displayName: "View Activities & Registrations",
        uid: "read",
        pluginName: "event-management",
        subCategory: "Activities",
      },
      {
        section: "plugins",
        displayName: "Export Registration Data",
        uid: "export",
        pluginName: "event-management",
        subCategory: "Activities",
      },
      {
        section: "plugins",
        displayName: "Send Confirmation Emails",
        uid: "send-confirmations",
        pluginName: "event-management",
        subCategory: "Operations",
      },
      {
        section: "plugins",
        displayName: "Manage Waitlist & Promotions",
        uid: "manage-waitlist",
        pluginName: "event-management",
        subCategory: "Operations",
      },
      {
        section: "plugins",
        displayName: "Confirm & Cancel Registrations",
        uid: "manage-registrations",
        pluginName: "event-management",
        subCategory: "Operations",
      },
    ]);
  },
  controllers,
  routes,
  services,
};
