import type { Core } from '@strapi/strapi';
import { discoverFields } from './csv';

const REGISTRATION_UID = 'api::activity-registration.activity-registration' as const;

const DEFAULT_PAGE_SIZE = 20;

function sortRegistrations(list: any[], sortBy: string, sortOrder: 'asc' | 'desc') {
  const dir = sortOrder === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortBy) {
      case 'id':
        aVal = a.id ?? 0;
        bVal = b.id ?? 0;
        return dir * (Number(aVal) - Number(bVal));
      case 'fullName':
        aVal = a.registreeData?.fullName ?? '';
        bVal = b.registreeData?.fullName ?? '';
        break;
      case 'dob':
        aVal = a.registreeData?.dob ?? '';
        bVal = b.registreeData?.dob ?? '';
        break;
      default: // registeredAt / createdAt
        aVal = a.createdAt ?? '';
        bVal = b.createdAt ?? '';
    }
    return dir * String(aVal).localeCompare(String(bVal));
  });
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listRegistrations(
    activityId: number,
    {
      status,
      confirmed,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }: {
      status?: string;
      confirmed?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    },
  ) {
    const activityIds = await strapi.plugin('event-management').service('activities').getAllRowIds(activityId);

    const filters: Record<string, any> = {
      registeredActivity: { id: { $in: activityIds } },
    };
    if (status) filters.registrationStatus = { $eq: status };
    if (confirmed !== undefined) filters.confirmed = { $eq: confirmed };

    const all = await strapi.db.query(REGISTRATION_UID).findMany({
      where: filters,
      populate: { registreeData: true },
    });

    const sorted = sortRegistrations(all as any[], sortBy ?? 'registeredAt', sortOrder ?? 'asc');

    const p = Math.max(1, page ?? 1);
    const ps = Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE);
    const total = sorted.length;
    const pageCount = Math.ceil(total / ps);
    const data = sorted.slice((p - 1) * ps, p * ps);

    return { data, meta: { pagination: { page: p, pageSize: ps, total, pageCount } } };
  },

  async getAllForActivity(activityId: number) {
    const activityIds = await strapi.plugin('event-management').service('activities').getAllRowIds(activityId);
    return strapi.db.query(REGISTRATION_UID).findMany({
      where: { registeredActivity: { id: { $in: activityIds } } },
      orderBy: { createdAt: 'asc' },
      populate: { registreeData: true },
    });
  },

  /**
   * Discover all unique export field keys across all registrations
   * (metadata + registreeData fields + flattened registrationPayload keys).
   */
  async getAvailableFields(activityId: number): Promise<string[]> {
    const registrations = await this.getAllForActivity(activityId);
    return discoverFields(registrations as any[]);
  },
});
