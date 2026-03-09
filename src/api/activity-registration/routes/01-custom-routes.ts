export default {
  routes: [
    {
      method: "GET",
      path: "/activity-registrations/confirm",
      handler: "activity-registration.confirm",
      config: {
        policies: [],
        middlewares: [],
        auth: false, // Publicly accessible so users can click the link
      },
    },
  ],
};
