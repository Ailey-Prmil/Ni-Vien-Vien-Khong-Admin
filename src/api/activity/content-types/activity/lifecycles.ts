import { errors } from '@strapi/utils';

const { ValidationError } = errors;

function assertEndAfterStart(start: string | undefined | null, end: string | undefined | null) {
  if (start && end && end <= start) {
    throw new ValidationError('activityEndDate must be after activityStartDate');
  }
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    assertEndAfterStart(data.activityStartDate, data.activityEndDate);
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;

    const updatingStart = data.activityStartDate !== undefined;
    const updatingEnd = data.activityEndDate !== undefined;

    // Both dates present in the payload — validate directly.
    if (updatingStart && updatingEnd) {
      assertEndAfterStart(data.activityStartDate, data.activityEndDate);
      return;
    }

    // Only one date is changing — fetch the existing record for the other.
    if (updatingStart || updatingEnd) {
      const existing = await strapi.db
        .query('api::activity.activity')
        .findOne({ where, select: ['activityStartDate', 'activityEndDate'] });

      const startDate = updatingStart ? data.activityStartDate : existing?.activityStartDate;
      const endDate = updatingEnd ? data.activityEndDate : existing?.activityEndDate;
      assertEndAfterStart(startDate, endDate);
    }
  },
};
