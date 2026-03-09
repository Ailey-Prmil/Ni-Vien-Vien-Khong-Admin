// config/env/production/plugins.ts
// Production-specific email configuration for Strapi Cloud

export default ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env('SMTP_PORT', 587),
        secure: false, // true for 465, false for other ports
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_DEFAULT_FROM', 'thejourneytofuture@gmail.com'),
        defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'thejourneytofuture@gmail.com'),
      },
    },
  },
});
