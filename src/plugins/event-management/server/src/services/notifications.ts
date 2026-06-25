import { randomUUID } from "crypto";
import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "api::activity.activity" as const;
const REGISTRATION_UID =
  "api::activity-registration.activity-registration" as const;

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async sendConfirmationEmails(
    activityId: number,
    { resend = false }: { resend?: boolean } = {},
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const [activity, registrations] = await Promise.all([
      strapi.db.query(ACTIVITY_UID).findOne({
        where: { id: activityId },
        select: [
          "activityName",
          "zaloGroup",
          "activityStartDate",
          "activityEndDate",
          "slug",
          "documentId",
          "confirmExpiredDate",
        ],
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
    const zaloGroup = (activity as any)?.zaloGroup ?? "";
    const slug = (activity as any)?.slug ?? "";
    const documentId = (activity as any)?.documentId ?? "";
    const frontendUrl =
      process.env.FRONTEND_URL || "https://www.vienkhongni.com";
    // Use the activity's explicit confirmation deadline if set; otherwise fall
    // back to a 3-day window from the moment the email is sent.
    const confirmExpiredDate = (activity as any)?.confirmExpiredDate;
    const expiresAt = confirmExpiredDate
      ? new Date(confirmExpiredDate)
      : new Date(Date.now() + THREE_DAYS_MS);

    const formatDateTime = (value: unknown): string =>
      value
        ? new Date(value as string).toLocaleString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

    const startStr = formatDateTime((activity as any)?.activityStartDate);
    const endStr = formatDateTime((activity as any)?.activityEndDate);
    const location =
      "Ni Viện Viên Không – Tổ 2, Ấp 4, Xã Châu Pha, Thành phố Hồ Chí Minh, Việt Nam";

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const reg of registrations as any[]) {
      // skip registrations already confirmed (by link click or by admin)
      if (reg.confirmed) {
        skipped++;
        continue;
      }

      // resend=false: skip already-sent (only send to unsent)
      // resend=true: skip NOT-yet-sent (only re-send to already-sent)
      if (!resend && reg.confirmationEmailSentAt) {
        skipped++;
        continue;
      }
      if (resend && !reg.confirmationEmailSentAt) {
        skipped++;
        continue;
      }

      const email = reg.registreeData?.email ?? reg.email;
      const fullName = reg.registreeData?.fullName ?? reg.fullName ?? "";

      if (!email) {
        failed++;
        continue;
      }

      try {
        // Refresh token and set 3-day expiry (without marking sent yet)
        const newToken = randomUUID();
        await strapi.db.query(REGISTRATION_UID).update({
          where: { id: reg.id },
          data: {
            confirmationToken: newToken,
            tokenExpiresAt: expiresAt,
          },
        });

        const confirmationLink = `${frontendUrl}/activity/${slug}-${documentId}/confirm?code=${newToken}`;
        const expiryDateStr = formatDateTime(expiresAt);

        await strapi.plugins["email"].services.email.send({
          to: email,
          from: process.env.SMTP_DEFAULT_FROM || process.env.EMAIL_DEFAULT_FROM,
          subject: `Xác nhận tham gia sự kiện "${activityName}" - Ni Viện Viên Không`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <div style="background-color: #8B4513; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="color: #ffffff; margin: 0;">Ni Viện Viên Không</h2>
                <p style="color: #f0e6d2; margin: 6px 0 0; font-size: 14px;">Xác nhận đăng ký tham gia sự kiện</p>
              </div>

              <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                <p>Kính gửi <strong>${fullName}</strong>,</p>
                <p>
                  Ban Tổ Chức chân thành cảm ơn Quý vị đã đăng ký tham gia sự kiện
                  <strong>${activityName}</strong>. Chúng tôi xin trân trọng xác nhận Quý vị đã
                  <strong>đăng ký thành công</strong> chương trình.
                </p>

                <div style="background-color: #faf6f0; border-left: 4px solid #8B4513; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
                  <h3 style="color: #8B4513; margin: 0 0 12px;">Thông tin chương trình</h3>
                  ${startStr ? `<p style="margin: 6px 0;"><strong>Bắt đầu (Check-in):</strong> ${startStr}</p>` : ""}
                  ${endStr ? `<p style="margin: 6px 0;"><strong>Kết thúc (Check-out):</strong> ${endStr}</p>` : ""}
                  <p style="margin: 6px 0;"><strong>Địa điểm:</strong> ${location}</p>
                </div>

                <p>
                  Để Ban Tổ Chức chuẩn bị chu đáo về không gian và công tác tổ chức, kính mong Quý vị
                  vui lòng xác nhận sự tham dự bằng cách nhấp vào nút bên dưới:
                </p>

                <p style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationLink}"
                     style="background-color: #8B4513; color: white; padding: 12px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Xác nhận tham dự
                  </a>
                </p>

                <p style="color: #c0392b; font-size: 14px;"><strong>Lưu ý:</strong> Link xác nhận sẽ hết hạn vào ngày <strong>${expiryDateStr}</strong>. Nếu không xác nhận trước thời hạn, đăng ký của Quý vị sẽ bị hủy tự động.</p>

                <p>Ban Tổ Chức rất hân hạnh được chào đón Quý vị trong hành trình sắp tới.</p>

                ${
                  zaloGroup
                    ? `<p style="font-size: 14px;">Mọi thông tin chi tiết của chương trình sẽ được cập nhật qua nhóm Zalo: <a href="${zaloGroup}" style="color: #8B4513;">${zaloGroup}</a></p>`
                    : ""
                }

                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="margin: 4px 0;">Trân trọng,</p>
                <p style="margin: 4px 0; font-weight: bold; color: #8B4513;">Ban Tổ Chức – Ni Viện Viên Không</p>
                <p style="margin: 12px 0 0; font-size: 13px; color: #666;">Website: <a href="https://vienkhongni.com" style="color: #8B4513;">vienkhongni.com</a></p>
              </div>
            </div>
          `,
        });

        // Mark as sent only after the email was successfully delivered
        await strapi.db.query(REGISTRATION_UID).update({
          where: { id: reg.id },
          data: { confirmationEmailSentAt: new Date() },
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

    return { sent, failed, skipped };
  },
});
