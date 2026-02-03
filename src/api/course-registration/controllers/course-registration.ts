/**
 * course-registration controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::course-registration.course-registration', ({ strapi }) => ({
    async confirm(ctx) {
        const { code } = ctx.query;

        if (!code) {
            return ctx.badRequest('Missing confirmation token');
        }

        try {
            // Find the registration with this token
            const entries = await strapi.entityService.findMany('api::course-registration.course-registration', {
                filters: { confirmationToken: code },
                populate: ['registedCourse'], // Ensure we fetch the relation
                limit: 1,
            });

            const entry = (Array.isArray(entries) ? entries[0] : entries) as any;

            if (!entry) {
                return ctx.notFound('Invalid or expired confirmation token');
            }

            if (entry.confirmed) {
                return ctx.send({ message: 'Registration already confirmed' });
            }

            // Update the entry to confirmed
            await strapi.entityService.update('api::course-registration.course-registration', entry.id, {
                data: {
                    confirmed: true,
                    confirmationToken: null, // Optional: Clear to prevent re-use
                },
            });

            return ctx.send({
                message: 'Registration confirmed successfully',
                data: {
                    id: entry.id,
                    fullName: entry.fullName,
                    course: entry.registedCourse
                }
            });

        } catch (err) {
            ctx.body = err;
        }
    }
}));
