// config/plugins.ts
export default ({ env }) => {
  if (env("NODE_ENV") === "development") {
    return {
      upload: {
        config: {
          breakpoints: {},
        },
      },
    };
  }

  return {};
};
