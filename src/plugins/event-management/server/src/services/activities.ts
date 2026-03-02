import type { Core } from '@strapi/strapi';

const ACTIVITY_UID = 'api::activity.activity' as const;

const VALID_SORT_FIELDS = ['activityName', 'activityStartDate', 'activityCategory'];

const ACTIVITY_CATEGORIES = [
  'Phật Sự Trong Nước',
  'Phật Sự Nước Ngoài',
  'Lớp Học Phật Pháp',
  'Tin Tức Khác',
  'Khóa Tu',
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listActivities({
    search,
    sortBy,
    sortOrder,
    categories,
  }: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    categories?: string[];
  }) {
    const filters: Record<string, any> = {};

    if (search) {
      filters.activityName = { $containsi: search };
    }
    if (categories && categories.length > 0) {
      const valid = categories.filter((c) => ACTIVITY_CATEGORIES.includes(c));
      if (valid.length > 0) {
        filters.activityCategory = { $in: valid };
      }
    }

    const sort: any =
      sortBy && VALID_SORT_FIELDS.includes(sortBy)
        ? { [sortBy]: sortOrder || 'asc' }
        : { activityStartDate: 'asc' };

    return strapi.entityService.findMany(ACTIVITY_UID, {
      filters,
      sort,
      populate: { coverImage: { fields: ['url', 'name'] } },
    });
  },

  async getActivity(id: number) {
    return strapi.entityService.findOne(ACTIVITY_UID, id, {
      populate: {
        coverImage: { fields: ['url', 'name'] },
        registrationForm: true,
        courseContent: true,
      },
    });
  },
});
