// routes/index.ts
export default {
  admin: {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/activities",
        handler: "event-management.listActivities",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "GET",
        path: "/activities/:id",
        handler: "event-management.getActivity",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "GET",
        path: "/activities/:id/stats",
        handler: "event-management.getStats",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "GET",
        path: "/activities/:id/registrations",
        handler: "event-management.listRegistrations",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "GET",
        path: "/activities/:id/available-fields",
        handler: "event-management.getAvailableFields",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "GET",
        path: "/activities/:id/export-csv",
        handler: "event-management.exportCsv",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "POST",
        path: "/activities/:id/send-confirmations",
        handler: "event-management.sendConfirmationEmails",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "POST",
        path: "/activities/:id/promote-waitlist",
        handler: "event-management.promoteWaitlist",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
      {
        method: "POST",
        path: "/registrations/:registrationId/promote",
        handler: "event-management.promoteRegistration",
        config: { policies: ["admin::isAuthenticatedAdmin"] },
      },
    ],
  },
};
