import type { StrapiApp } from '@strapi/strapi/admin';
import eventManagementPlugin from '../plugins/event-management/admin/src/index';

export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    eventManagementPlugin.register(app);
  },
  bootstrap(_app: StrapiApp) {},
};
