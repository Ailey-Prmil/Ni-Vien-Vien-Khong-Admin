export default {
    routes: [
        {
            method: 'GET',
            path: '/course-registrations/confirm',
            handler: 'course-registration.confirm',
            config: {
                policies: [],
                middlewares: [],
                auth: false, // Publicly accessible so users can click the link
            },
        },
    ],
};
