import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ── One-time idempotent consolidation onto the stable draft row ───────────
    // In Strapi v5, draft and published versions of an activity are separate DB
    // rows sharing a documentId. The published row is deleted/recreated on every
    // publish & unpublish, which orphans registrations linked to it. We now
    // anchor every registration to the draft row (see the activity-registration
    // beforeCreate lifecycle), which is never deleted across publish/unpublish.
    //
    // This routine moves any pre-existing registration that is still linked to a
    // PUBLISHED row onto its document's draft row. It is safe to run on every
    // boot: registrations already on a draft row are skipped, so it no-ops once
    // the data is consolidated.
    try {
      // Cache of documentId(+locale) → draft row id to avoid repeated lookups.
      const draftCache = new Map<string, number | null>();

      const resolveDraftId = async (
        documentId: string,
        locale: string | null,
      ): Promise<number | null> => {
        const key = `${documentId}::${locale ?? ""}`;
        if (draftCache.has(key)) return draftCache.get(key)!;

        const draft =
          ((await strapi.db.query(ACTIVITY_UID).findOne({
            where: {
              documentId,
              publishedAt: null,
              ...(locale ? { locale } : {}),
            },
            select: ["id"],
          })) as any) ??
          ((await strapi.db.query(ACTIVITY_UID).findOne({
            where: { documentId, publishedAt: null },
            select: ["id"],
          })) as any);

        const draftId = draft?.id ?? null;
        draftCache.set(key, draftId);
        return draftId;
      };

      const regs = (await strapi.db.query(REGISTRATION_UID).findMany({
        where: { registeredActivity: { publishedAt: { $notNull: true } } },
        select: ["id"],
        populate: {
          registeredActivity: {
            select: ["id", "documentId", "locale", "publishedAt"],
          },
        },
      })) as any[];

      let moved = 0;
      for (const reg of regs) {
        const act = reg.registeredActivity;
        if (!act?.documentId) continue;

        const draftId = await resolveDraftId(act.documentId, act.locale ?? null);
        if (!draftId || draftId === act.id) continue;

        await strapi.db.query(REGISTRATION_UID).update({
          where: { id: reg.id },
          data: { registeredActivity: { set: [{ id: draftId }] } },
        });
        moved++;
      }

      if (moved > 0) {
        strapi.log.info(
          `[bootstrap] consolidated ${moved} registration(s) onto their activity's draft row`,
        );
      }
    } catch (err) {
      strapi.log.error(
        "[bootstrap] registration draft-row consolidation failed:",
        err,
      );
    }

    // Scheduled tasks (openScheduledForms / cancelExpiredRegistrations) are
    // registered via `cron.tasks` in config/server.ts, which calls the
    // api::activity.cron service. Do NOT also register them here — a single
    // registration path avoids duplicate runs and confusion.
  },
};
