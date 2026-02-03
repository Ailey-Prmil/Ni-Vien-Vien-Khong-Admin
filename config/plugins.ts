// config/plugins.ts

export default ({ env }) => {
  const config: any = {
    documentation: {
      enabled: true,
      config: {
        openapi: "3.0.0",
        info: {
          version: "2.0.0",
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
        provider: "nodemailer",
        providerOptions: {
          host: env("SMTP_HOST", "smtp.gmail.com"),
          port: env("SMTP_PORT", 587),
          auth: {
            user: env("SMTP_USERNAME"),
            pass: env("SMTP_PASSWORD"),
          },
        },
        settings: {
          defaultFrom: env("SMTP_DEFAULT_FROM", "22520038@gm.uit.edu.vn"),
          defaultReplyTo: env(
            "SMTP_DEFAULT_REPLY_TO",
            "22520038@gm.uit.edu.vn",
          ),
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
