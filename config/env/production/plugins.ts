export default ({ env }) => ({
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'),
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM', 'no-reply@contact.vienkhongni.com'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLY_TO', 'no-reply@contact.vienkhongni.com'),
      },
    },
  },
});
