import type { StrapiApp } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "./pluginId";
import { Bell } from "@strapi/icons";

const eventManagementPlugin = {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });

    app.addMenuLink({
      to: `/plugins/${PLUGIN_ID}`,
      // CalendarIcon from @strapi/icons requires the package — use a safe fallback
      icon: Bell,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Event Management",
      },
      permissions: [{ action: "plugin::event-management.read" }],
      Component: () =>
        import("./pages/App").then((mod) => ({ default: mod.App })),
    });
  },
};

export default eventManagementPlugin;
