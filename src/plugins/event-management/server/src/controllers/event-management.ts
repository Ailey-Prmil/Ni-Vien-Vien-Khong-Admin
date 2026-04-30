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
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);
      const data = await svc('stats').getStats(id);
      ctx.body = { data };
    },

    async listRegistrations(ctx: any) {
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);
      const { status, sortBy, sortOrder, search } = ctx.query;
      const page = ctx.query.page ? Number(ctx.query.page) : 1;
      const pageSize = ctx.query.pageSize ? Number(ctx.query.pageSize) : 20;

      let confirmed: boolean | undefined;
      if (ctx.query.confirmed === 'true') confirmed = true;
      else if (ctx.query.confirmed === 'false') confirmed = false;

      const result = await svc('registrations').listRegistrations(id, {
        status,
        confirmed,
        search: search ? String(search) : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      ctx.body = result;
    },

    async getAvailableFields(ctx: any) {
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);
      const fields = await svc('registrations').getAvailableFields(id);
      ctx.body = { data: fields };
    },

    async exportCsv(ctx: any) {
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);

      const allFields: { key: string; label: string }[] = await svc('registrations').getAvailableFields(id);

      // ?fields=key1,key2,key3  — comma-separated list of selected field keys
      const rawFields = ctx.query.fields as string | undefined;
      const selectedKeys = rawFields
        ? rawFields.split(',').map((f: string) => f.trim()).filter(Boolean)
        : allFields.map((f) => f.key);

      const selectedFields = allFields.filter((f) => selectedKeys.includes(f.key));

      const registrations = await svc('registrations').getAllForActivity(id);
      const csv = generateCsvString(registrations as any[], selectedFields);

      ctx.body = { data: csv };
    },

    async sendConfirmationEmails(ctx: any) {
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);
      const resend = ctx.request.body?.data?.resend === true;
      const result = await svc('notifications').sendConfirmationEmails(id, { resend });
      ctx.body = { data: result };
    },

    async promoteRegistration(ctx: any) {
      const registrationId = Number(ctx.params.registrationId);
      if (!Number.isInteger(registrationId) || registrationId < 1) {
        return ctx.badRequest('`registrationId` must be a positive integer');
      }
      const result = await svc('waitlist').promoteRegistration(registrationId);
      if ('error' in result) {
        if (result.error === 'not_found') return ctx.notFound('Registration not found or not pending');
        if (result.error === 'no_slots') return ctx.badRequest('No available slots — increase the registration limit first');
      }
      ctx.body = { data: result };
    },

    async promoteWaitlist(ctx: any) {
      const rawId = Number(ctx.params.id);
      const id = await svc('activities').resolvePublishedId(rawId);
      const count = Number(ctx.request.body?.data?.count);

      if (!Number.isInteger(count) || count < 1) {
        return ctx.badRequest('`count` must be a positive integer');
      }

      const result = await svc('waitlist').promoteWaitlist(id, count);
      ctx.body = { data: result };
    },

    async confirmRegistration(ctx: any) {
      const registrationId = Number(ctx.params.registrationId);
      if (!Number.isInteger(registrationId) || registrationId < 1) {
        return ctx.badRequest('`registrationId` must be a positive integer');
      }
      const result = await svc('registrations').confirmRegistration(registrationId);
      if ('error' in result) {
        if (result.error === 'not_found') return ctx.notFound('Registration not found');
        if (result.error === 'not_active') return ctx.badRequest('Only active registrations can be confirmed');
      }
      ctx.body = { data: result };
    },

    async cancelRegistration(ctx: any) {
      const registrationId = Number(ctx.params.registrationId);
      if (!Number.isInteger(registrationId) || registrationId < 1) {
        return ctx.badRequest('`registrationId` must be a positive integer');
      }
      const result = await svc('registrations').cancelRegistration(registrationId);
      if ('error' in result) {
        if (result.error === 'not_found') return ctx.notFound('Registration not found');
      }
      ctx.body = { data: result };
    },
  };
};
