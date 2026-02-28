// config/plugins.ts

export default ({ env }) => {
  const config: any = {
    documentation: {
      enabled: true,
      config: {
        openapi: "3.0.0",
        info: {
          version: "3.0.0",
          title: "Ni Vien Vien Khong API",
          description: "API documentation for Buddhist monastery website",
          contact: {
            name: "API Support",
            email: "22520038@gm.uit.edu.vn",
          },
        },
        "x-strapi-config": {
          plugins: ["users-permissions", "upload"],
        },
        restrictedAccess: true, // Always require admin login to view docs
      },
    },
    email: {
      config: {
        provider: "strapi-provider-email-resend",
        providerOptions: {
          apiKey: env("RESEND_API_KEY"),
        },
        settings: {
          defaultFrom: env("EMAIL_DEFAULT_FROM", "no-reply@contact.vienkhongni.com"),
          defaultReplyTo: env("EMAIL_DEFAULT_REPLY_TO", "no-reply@contact.vienkhongni.com"),
        },
      },
    },
  };

  if (env("NODE_ENV") === "development") {
    config.upload = {
      config: {
        breakpoints: {},
      },
    };
  }

  return config;
};
