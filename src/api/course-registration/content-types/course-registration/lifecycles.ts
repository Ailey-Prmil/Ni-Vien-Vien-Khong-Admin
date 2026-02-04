import { v4 as uuidv4 } from 'uuid';

export default {
    async beforeCreate(event) {
        const { data } = event.params;

        // Auto-generate confirmation token if not present
        if (!data.confirmationToken) {
            data.confirmationToken = uuidv4();
        }
        data.confirmed = false; // Always force false initially
    },

    async afterCreate(event) {
        const { result } = event;

        try {
            if (!result.email) {
                console.warn('[CourseRegistration] No email found for registration ID:', result.id);
                return;
            }

            // Construct the confirmation URL - points to backend API
            // The backend will handle confirmation and redirect to frontend
            const backendUrl = process.env.STRAPI_ADMIN_URL || 'http://localhost:1337';
            const confirmationLink = `${backendUrl}/api/course-registrations/confirm?code=${result.confirmationToken}`;

            // Debug logging
            // console.log('[CourseRegistration] ========== EMAIL DEBUG ==========');
            // console.log('[CourseRegistration] STRAPI_ADMIN_URL env:', process.env.STRAPI_ADMIN_URL);
            // console.log('[CourseRegistration] backendUrl used:', backendUrl);
            // console.log('[CourseRegistration] confirmationToken:', result.confirmationToken);
            // console.log('[CourseRegistration] FULL confirmationLink:', confirmationLink);
            // console.log('[CourseRegistration] ================================');

            await strapi.plugins['email'].services.email.send({
                to: result.email,
                from: process.env.SMTP_DEFAULT_FROM || process.env.EMAIL_DEFAULT_FROM,
                subject: `Xác nhận đăng ký khóa tu - Ni Viện Viên Không`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Xác nhận đăng ký khóa tu</h2>
            <p>Xin chào <strong>${result.fullName}</strong>,</p>
            <p>Chúng tôi đã nhận được yêu cầu đăng ký của bạn. Để hoàn tất việc đăng ký, vui lòng nhấn vào nút xác nhận bên dưới:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" 
                 style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Xác nhận đăng ký
              </a>
            </p>

            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Ni Viện Viên Không</p>
          </div>
        `,
            });

            console.log(`[CourseRegistration] DEBUG: Confirmation Link: ${confirmationLink}`);
            console.log(`[CourseRegistration] Confirmation email sent to ${result.email}. ID: ${result.id}`);

        } catch (error) {
            console.error('[CourseRegistration] Error sending confirmation email:', error);
        }
    },
};
