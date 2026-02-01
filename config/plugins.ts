// config/plugins.ts
export default ({ env }) => {
  const config: any = {
    documentation: {
      enabled: true,
      config: {
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: 'Ni Vien Vien Khong API',
          description: 'API documentation for Buddhist monastery website',
          contact: {
            name: 'API Support',
            email: '22520038@gm.uit.edu.vn',
          },
        },
        'x-strapi-config': {
          plugins: ['users-permissions', 'upload'],
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
