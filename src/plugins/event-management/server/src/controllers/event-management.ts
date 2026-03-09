import type { Core } from '@strapi/strapi';
import { generateCsvString } from '../services/csv';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = (name: string) => strapi.plugin('event-management').service(name);

  return {
    async listActivities(ctx: any) {
      const { search, sortBy, sortOrder } = ctx.query;
      const categories = ctx.query.categories
        ? String(ctx.query.categories).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const data = await svc('activities').listActivities({
        search,
        sortBy,
        sortOrder,
        categories,
      });
      ctx.body = { data };
    },

    async getActivity(ctx: any) {
      const id = Number(ctx.params.id);
      const data = await svc('activities').getActivity(id);
      if (!data) return ctx.notFound();
      ctx.body = { data };
    },

    async getStats(ctx: any) {
      const id = Number(ctx.params.id);
      const data = await svc('stats').getStats(id);
      ctx.body = { data };
    },

    async listRegistrations(ctx: any) {
      const id = Number(ctx.params.id);
      const { status, sortBy, sortOrder } = ctx.query;
      const page = ctx.query.page ? Number(ctx.query.page) : 1;
      const pageSize = ctx.query.pageSize ? Number(ctx.query.pageSize) : 20;

      let confirmed: boolean | undefined;
      if (ctx.query.confirmed === 'true') confirmed = true;
      else if (ctx.query.confirmed === 'false') confirmed = false;

      const result = await svc('registrations').listRegistrations(id, {
        status,
        confirmed,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      ctx.body = result;
    },

    async getAvailableFields(ctx: any) {
      const id = Number(ctx.params.id);
      const fields = await svc('registrations').getAvailableFields(id);
      ctx.body = { data: fields };
    },

    async exportCsv(ctx: any) {
      const id = Number(ctx.params.id);

      // ?fields=field1,field2,field3  — comma-separated list of selected fields
      const rawFields = ctx.query.fields as string | undefined;
      const selectedFields = rawFields
        ? rawFields.split(',').map((f: string) => f.trim()).filter(Boolean)
        : await svc('registrations').getAvailableFields(id); // default: all fields

      const registrations = await svc('registrations').getAllForActivity(id);
      const csv = generateCsvString(registrations as any[], selectedFields);

      ctx.body = { data: csv };
    },

    async sendConfirmationEmails(ctx: any) {
      const id = Number(ctx.params.id);
      const result = await svc('notifications').sendConfirmationEmails(id);
      ctx.body = { data: result };
    },

    async promoteWaitlist(ctx: any) {
      const id = Number(ctx.params.id);
      const count = Number(ctx.request.body?.data?.count);

      if (!Number.isInteger(count) || count < 1) {
        return ctx.badRequest('`count` must be a positive integer');
      }

      const result = await svc('waitlist').promoteWaitlist(id, count);
      ctx.body = { data: result };
    },
  };
};
