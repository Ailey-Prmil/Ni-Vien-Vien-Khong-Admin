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
  /**
   * Given any numeric row ID (draft or published), return the published row's
   * numeric ID for the same document. Returns the input id if already published
   * or if no published version exists.
   */
  async resolvePublishedId(id: number): Promise<number> {
    const row = (await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id },
      select: ['id', 'documentId', 'publishedAt'],
    })) as any;

    if (!row) return id;
    // Already the published row
    if (row.publishedAt) return id;

    // It's the draft row — find the published sibling
    const published = (await strapi.db.query(ACTIVITY_UID).findOne({
      where: { documentId: row.documentId, publishedAt: { $notNull: true } },
      select: ['id'],
    })) as any;

    return published?.id ?? id;
  },

  /**
   * Returns ALL numeric row IDs (draft + published, every locale) that belong
   * to the same document as the given row ID. Using $in across all of these
   * ensures we find registrations regardless of which row they were linked to.
   */
  async getAllRowIds(id: number): Promise<number[]> {
    const row = (await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id },
      select: ['id', 'documentId'],
    })) as any;

    if (!row?.documentId) return [id];

    const rows = (await strapi.db.query(ACTIVITY_UID).findMany({
      where: { documentId: row.documentId },
      select: ['id'],
    })) as any[];

    const ids = rows.map((r: any) => r.id as number);
    return ids.length > 0 ? ids : [id];
  },

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

    return strapi.documents(ACTIVITY_UID).findMany({
      filters,
      sort,
      status: 'published',
      populate: { coverImage: { fields: ['url', 'name'] } },
    });
  },

  async getActivity(id: number) {
    const row = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { id },
      select: ['documentId'],
    }) as any;
    if (!row?.documentId) return null;

    return strapi.documents(ACTIVITY_UID).findOne({
      documentId: row.documentId,
      status: 'published',
      populate: {
        coverImage: { fields: ['url', 'name'] },
        registrationForm: true,
        courseContent: true,
      },
    });
  },
});
