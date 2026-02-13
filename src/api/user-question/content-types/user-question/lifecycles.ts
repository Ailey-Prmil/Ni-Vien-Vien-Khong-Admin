// Helper function to convert Strapi blocks to HTML for email
function blocksToHtml(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'paragraph':
        const text = block.children?.map((child: any) => {
          let content = child.text || '';
          if (child.bold) content = `<strong>${content}</strong>`;
          if (child.italic) content = `<em>${content}</em>`;
          if (child.underline) content = `<u>${content}</u>`;
          return content;
        }).join('') || '';
        return `<p>${text}</p>`;

      case 'heading':
        const level = block.level || 2;
        const headingText = block.children?.map((child: any) => child.text || '').join('') || '';
        return `<h${level}>${headingText}</h${level}>`;

      case 'list':
        const tag = block.format === 'ordered' ? 'ol' : 'ul';
        const items = block.children?.map((item: any) => {
          const itemText = item.children?.map((child: any) => child.text || '').join('') || '';
          return `<li>${itemText}</li>`;
        }).join('') || '';
        return `<${tag}>${items}</${tag}>`;

      case 'quote':
        const quoteText = block.children?.map((child: any) => child.text || '').join('') || '';
        return `<blockquote style="border-left: 4px solid #8B4513; padding-left: 15px; margin: 10px 0; color: #555;">${quoteText}</blockquote>`;

      default:
        return '';
    }
  }).join('');
}

// Helper function to send answer email to user
async function sendAnswerEmailToUser(result: any, executionId: number) {
  // Check if there's any response content
  const hasBlogResponse = result.blogResponseContent?.responseContent;
  const hasVideoResponse = result.videoResponseContent?.videoLink;

  if (!hasBlogResponse && !hasVideoResponse) {
    console.log(`[UserQuestion] Skipping answer email - no response content provided. ID: ${executionId}`);
    return;
  }

  console.log(`[UserQuestion] Sending answer email to user: ${result.email}. ID: ${executionId}`);

  // Build response content HTML
  let responseHtml = '';

  if (hasBlogResponse) {
    const blogTitle = result.blogResponseContent.title || 'Câu trả lời';
    const blogContent = blocksToHtml(result.blogResponseContent.responseContent);
    responseHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #8B4513; margin-bottom: 10px;">${blogTitle}</h3>
        <div style="background: #fff; padding: 15px; border-radius: 5px;">
          ${blogContent}
        </div>
      </div>
    `;
  }

  if (hasVideoResponse) {
    const videoTitle = result.videoResponseContent.title || 'Video trả lời';
    const videoLink = result.videoResponseContent.videoLink;
    responseHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #8B4513; margin-bottom: 10px;">${videoTitle}</h3>
        <p>
          <a href="${videoLink}" style="color: #8B4513; text-decoration: underline;">
            ${videoLink}
          </a>
        </p>
      </div>
    `;
  }

  const emailSubject = process.env.USERQUESTION_ANSWER_EMAIL_SUBJECT ||
    `Câu hỏi của bạn đã được trả lời - Ni Viện Viên Không`;

  await strapi.plugins['email'].services.email.send({
    to: result.email,
    from: process.env.EMAIL_DEFAULT_FROM,
    replyTo: process.env.EMAIL_DEFAULT_REPLY_TO,
    subject: emailSubject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B4513;">Câu hỏi của bạn đã được trả lời</h2>

        <p>Xin chào <strong>${result.fullName}</strong>,</p>
        <p>Cảm ơn bạn đã gửi câu hỏi đến Ni Viện Viên Không. Chúng tôi đã có câu trả lời cho bạn.</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Câu hỏi của bạn:</strong></p>
          <blockquote style="background: #fff; padding: 15px; border-left: 4px solid #8B4513; margin: 0;">
            ${result.questionContent}
          </blockquote>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 15px 0;"><strong>Câu trả lời:</strong></p>
          ${responseHtml}
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          Trân trọng,<br/>
          <strong>Ni Viện Viên Không</strong>
        </p>
      </div>
    `,
  });

  console.log(`[UserQuestion] Answer email sent successfully to ${result.email}. ID: ${executionId}`);
}

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

      // Also check if this is being published with status "answered" (admin answered before publishing)
      if (result.questionStatus === 'answered' && result.email) {
        console.log(`[UserQuestion] Question published with status 'answered', sending answer email. ID: ${executionId}`);
        await sendAnswerEmailToUser(result, executionId);
      }
    } catch (error) {
      console.error(`[UserQuestion] Error sending email. ID: ${executionId}`, error);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const executionId = Date.now();
    console.log(`[UserQuestion] afterUpdate triggered. ID: ${executionId}, Result ID: ${result.id}, Status: ${result.questionStatus}`);

    try {
      // Only send email when:
      // 1. Entry is published
      // 2. Status is "answered"
      // 3. User has an email address
      if (!result.publishedAt) {
        console.log(`[UserQuestion] Skipping - not published. ID: ${executionId}`);
        return;
      }

      if (result.questionStatus !== 'answered') {
        console.log(`[UserQuestion] Skipping - status is not 'answered'. ID: ${executionId}`);
        return;
      }

      if (!result.email) {
        console.warn(`[UserQuestion] No email found for user. ID: ${executionId}`);
        return;
      }

      await sendAnswerEmailToUser(result, executionId);
    } catch (error) {
      console.error(`[UserQuestion] Error sending answer email. ID: ${executionId}`, error);
    }
  },
};