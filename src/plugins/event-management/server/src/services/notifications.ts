import { randomUUID } from "crypto";
import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async sendConfirmationEmails(
    activityId: number,
  ): Promise<{ sent: number; failed: number }> {
    const [activity, registrations] = await Promise.all([
      strapi.db.query(ACTIVITY_UID).findOne({
        where: { id: activityId },
        select: ["activityName", "zaloGroup"],
      }),
      strapi.db.query(REGISTRATION_UID).findMany({
        where: {
          registeredActivity: { id: activityId },
          registrationStatus: "active",
        },
        populate: { registreeData: true },
      }),
    ]);

    const activityName = (activity as any)?.activityName ?? "";
    const backendUrl =
      process.env.STRAPI_ADMIN_URL || "http://localhost:1337";
    const expiresAt = new Date(Date.now() + THREE_DAYS_MS);

    let sent = 0;
    let failed = 0;

    for (const reg of registrations as any[]) {
      const email = reg.registreeData?.email ?? reg.email;
      const fullName = reg.registreeData?.fullName ?? reg.fullName ?? "";

      if (!email) {
        failed++;
        continue;
      }

      try {
        // Refresh token and set 3-day expiry
        const newToken = randomUUID();
        await strapi.db.query(REGISTRATION_UID).update({
          where: { id: reg.id },
          data: {
            confirmationToken: newToken,
            tokenExpiresAt: expiresAt,
            confirmationEmailSentAt: new Date(),
          },
        });

        const confirmationLink = `${backendUrl}/api/activity-registrations/confirm?code=${newToken}`;
        const expiryDateStr = expiresAt.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        await strapi.plugins["email"].services.email.send({
          to: email,
          from:
            process.env.SMTP_DEFAULT_FROM || process.env.EMAIL_DEFAULT_FROM,
          subject: `Xác nhận tham gia sự kiện "${activityName}" - Ni Viện Viên Không`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8B4513;">Xác nhận tham gia sự kiện</h2>
              <p>Xin chào <strong>${fullName}</strong>,</p>
              <p>Bạn đã được chấp nhận tham gia sự kiện <strong>${activityName}</strong>.</p>
              <p>Vui lòng nhấn vào nút bên dưới để xác nhận sự tham gia của bạn:</p>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${confirmationLink}"
                   style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Xác nhận tham gia
                </a>
              </p>

              <p style="color: #c0392b;"><strong>Lưu ý:</strong> Link xác nhận sẽ hết hạn vào ngày <strong>${expiryDateStr}</strong>. Nếu không xác nhận trước thời hạn, đăng ký của bạn sẽ bị hủy tự động.</p>

              <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">Ni Viện Viên Không</p>
            </div>
          `,
        });

        strapi.log.info(
          `[event-management] Confirmation email sent to ${fullName} <${email}> for activity "${activityName}"`,
        );
        sent++;
      } catch (err) {
        strapi.log.error(
          `[event-management] Failed to send confirmation email to ${email}:`,
          err,
        );
        failed++;
      }
    }

    return { sent, failed };
  },

  async sendWaitlistPromotionEmail({
    registrationId,
    email,
    fullName,
    activityName,
  }: {
    registrationId: number;
    email: string;
    fullName?: string;
    activityName?: string;
  }): Promise<void> {
    const backendUrl = process.env.STRAPI_ADMIN_URL || "http://localhost:1337";
    const expiresAt = new Date(Date.now() + THREE_DAYS_MS);
    const newToken = randomUUID();

    // Refresh token + set 3-day expiry on the now-active registration
    await strapi.db.query(REGISTRATION_UID).update({
      where: { id: registrationId },
      data: {
        confirmationToken: newToken,
        tokenExpiresAt: expiresAt,
        confirmationEmailSentAt: new Date(),
      },
    });

    const confirmationLink = `${backendUrl}/api/activity-registrations/confirm?code=${newToken}`;
    const expiryDateStr = expiresAt.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    await strapi.plugins["email"].services.email.send({
      to: email,
      from: process.env.SMTP_DEFAULT_FROM || process.env.EMAIL_DEFAULT_FROM,
      subject: `Bạn đã được chọn tham gia sự kiện "${activityName}" - Ni Viện Viên Không`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Chúc mừng! Bạn đã được chấp nhận tham gia</h2>
          <p>Xin chào <strong>${fullName ?? email}</strong>,</p>
          <p>Bạn đã được chuyển từ danh sách chờ sang danh sách chính thức của sự kiện <strong>${activityName}</strong>.</p>
          <p>Vui lòng nhấn vào nút bên dưới để xác nhận sự tham gia của bạn:</p>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${confirmationLink}"
               style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Xác nhận tham gia
            </a>
          </p>

          <p style="color: #c0392b;"><strong>Lưu ý:</strong> Link xác nhận sẽ hết hạn vào ngày <strong>${expiryDateStr}</strong>. Nếu không xác nhận trước thời hạn, đăng ký của bạn sẽ bị hủy tự động.</p>

          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Ni Viện Viên Không</p>
        </div>
      `,
    });

    strapi.log.info(
      `[event-management] Waitlist promotion email sent to ${fullName} <${email}> for activity "${activityName}"`,
    );
  },
});
