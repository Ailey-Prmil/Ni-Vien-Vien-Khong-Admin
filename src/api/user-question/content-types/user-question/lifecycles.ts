export default {
  async afterCreate(event) {
    const { result } = event;
    const executionId = Date.now(); // Simple ID to track execution
    console.log(`[UserQuestion] afterCreate triggered. ID: ${executionId}, Result ID: ${result.id}, Locale: ${result.locale}, PublishedAt: ${result.publishedAt}`);

    try {
      // Only send email when the question is PUBLISHED (has a publishedAt date)
      // Strapi's Draft & Publish system triggers afterCreate twice: once for Draft (null), once for Published (date).
      // We ignore the Draft event to avoid duplicate emails.
      if (!result.publishedAt) {
        console.log(`[UserQuestion] Skipping Draft entry. ID: ${executionId}, Result ID: ${result.id}`);
        return;
      }

      // Fetch notification recipients from the collection
      const recipients = await strapi.entityService.findMany(
        'api::notification-recipient.notification-recipient',
        {
          filters: {
            isActive: true,
          },
          fields: ['email', 'name'],
        }
      );

      // Handle case where no recipients are configured
      if (!recipients || recipients.length === 0) {
        console.warn(
          `[UserQuestion] No active notification recipients configured. ` +
          `Please add recipients via Admin Panel. ID: ${executionId}`
        );
        return;
      }

      // Extract and deduplicate emails
      const recipientEmails = recipients
        .map((recipient) => recipient.email)
        .filter(Boolean);

      const uniqueRecipientEmails = [...new Set(recipientEmails)];

      if (uniqueRecipientEmails.length === 0) {
        console.warn(
          `[UserQuestion] Recipients found but no valid emails extracted. ID: ${executionId}`
        );
        return;
      }

      console.log(
        `[UserQuestion] Sending email to ${uniqueRecipientEmails.length} recipient(s): ` +
        `${uniqueRecipientEmails.join(', ')}. ID: ${executionId}`
      );

      // Get email subject from environment variable or use default
      const emailSubject = process.env.USERQUESTION_EMAIL_SUBJECT ||
        `New Question from ${result.fullName} - Ni Viện Viên Không`;

      // Send email to all recipients
      // Explicitly set from and replyTo for cloud-mailer compatibility
      await strapi.plugins['email'].services.email.send({
        to: uniqueRecipientEmails,
        from: process.env.EMAIL_DEFAULT_FROM,
        replyTo: process.env.EMAIL_DEFAULT_REPLY_TO,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Câu hỏi mới từ website</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
              <p><strong>Người gửi:</strong> ${result.fullName}</p>
              <p><strong>Email:</strong> ${result.email}</p>
              ${result.phoneNumber ? `<p><strong>Số điện thoại:</strong> ${result.phoneNumber}</p>` : ''}
              <p><strong>Câu hỏi:</strong></p>
              <blockquote style="background: #fff; padding: 15px; border-left: 4px solid #8B4513; margin: 10px 0;">
                ${result.questionContent}
              </blockquote>
              <p><strong>Trạng thái:</strong> <span style="color: #ff9800;">${result.questionStatus || 'pending'}</span></p>
              <p><strong>Thời gian:</strong> ${new Date(result.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            <p style="margin-top: 20px;">
              <a href="${process.env.STRAPI_ADMIN_URL || 'http://localhost:1337'}/admin/content-manager/collection-types/api::user-question.user-question/${result.documentId}" 
                 style="background-color: #8B4513; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Xem trong Admin Panel
              </a>
            </p>
          </div>
        `,
      });

      console.log(
        `[UserQuestion] Email sent successfully to ${uniqueRecipientEmails.length} recipient(s). ID: ${executionId}`
      );
    } catch (error) {
      console.error(`[UserQuestion] Error sending email. ID: ${executionId}`, error);
    }
  },
};