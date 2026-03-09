import activitiesService from './activities';
import statsService from './stats';
import registrationsService from './registrations';
import notificationsService from './notifications';
import waitlistService from './waitlist';

export default {
  activities: activitiesService,
  stats: statsService,
  registrations: registrationsService,
  notifications: notificationsService,
  waitlist: waitlistService,
};
