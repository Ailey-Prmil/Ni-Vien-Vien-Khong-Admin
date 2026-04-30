// routes/index.ts
export default {
  admin: {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/activities",
        handler: "event-management.listActivities",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.read"] },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/activities/:id",
        handler: "event-management.getActivity",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.read"] },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/activities/:id/stats",
        handler: "event-management.getStats",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.read"] },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/activities/:id/registrations",
        handler: "event-management.listRegistrations",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.read"] },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/activities/:id/available-fields",
        handler: "event-management.getAvailableFields",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.export"] },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/activities/:id/export-csv",
        handler: "event-management.exportCsv",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.export"] },
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/activities/:id/send-confirmations",
        handler: "event-management.sendConfirmationEmails",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::event-management.send-confirmations"],
              },
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/activities/:id/promote-waitlist",
        handler: "event-management.promoteWaitlist",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.manage-waitlist"] },
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/registrations/:registrationId/promote",
        handler: "event-management.promoteRegistration",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.manage-waitlist"] },
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/registrations/:registrationId/confirm",
        handler: "event-management.confirmRegistration",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.manage-registrations"] },
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/registrations/:registrationId/cancel",
        handler: "event-management.cancelRegistration",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::event-management.manage-registrations"] },
            },
          ],
        },
      },
    ],
  },
};
