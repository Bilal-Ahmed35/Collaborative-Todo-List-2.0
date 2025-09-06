// services/emailService.js

/**
 * Check if email service is available and configured
 * @returns {boolean} True if email service is available
 */
export const isEmailServiceAvailable = () => {
  // Check if we have email service configuration
  // You can add your email service API key checks here
  const hasEmailConfig = !!(
    process.env.REACT_APP_EMAIL_API_KEY ||
    process.env.REACT_APP_EMAILJS_SERVICE_ID ||
    process.env.REACT_APP_SMTP_CONFIG
  );

  // For development, you might want to return false to test link sharing
  // For production, return true only if properly configured
  return hasEmailConfig || process.env.NODE_ENV === "development";
};

/**
 * Generate invitation link
 * @param {Object} invitationData - Invitation details
 * @returns {string} Invitation URL
 */
const generateInvitationLink = (invitationData) => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    invite: invitationData.listId,
    email: invitationData.email,
    role: invitationData.role,
  });

  return `${baseUrl}/accept-invitation?${params.toString()}`;
};

/**
 * Send invitation email
 * @param {Object} invitationData - Invitation details
 * @param {string} invitationData.email - Recipient email
 * @param {string} invitationData.listName - List name
 * @param {string} invitationData.invitedByName - Inviter name
 * @param {string} invitationData.role - User role
 * @param {string} invitationData.listId - List ID
 * @returns {Promise<Object>} Email sending result
 */
export const sendInvitationEmail = async (invitationData) => {
  if (!isEmailServiceAvailable()) {
    throw new Error("Email service is not configured");
  }

  try {
    const invitationLink = generateInvitationLink(invitationData);

    // Email template
    const emailContent = {
      to: invitationData.email,
      subject: `You're invited to collaborate on "${invitationData.listName}"`,
      html: generateEmailTemplate(invitationData, invitationLink),
      text: generateTextTemplate(invitationData, invitationLink),
    };

    // Here you would integrate with your preferred email service
    // Examples: EmailJS, SendGrid, Nodemailer, etc.

    // Option 1: EmailJS (Frontend email service)
    if (process.env.REACT_APP_EMAILJS_SERVICE_ID) {
      return await sendWithEmailJS(emailContent, invitationData);
    }

    // Option 2: Your backend API
    return await sendWithBackendAPI(emailContent);
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Share invitation link using native sharing or clipboard
 * @param {Object} invitationData - Invitation details
 * @returns {Promise<Object>} Sharing result
 */
export const shareInvitationLink = async (invitationData) => {
  const invitationLink = generateInvitationLink(invitationData);
  const shareText = `${invitationData.invitedByName} invited you to collaborate on "${invitationData.listName}"`;

  try {
    // Try native Web Share API first (mobile/modern browsers)
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: `Invitation to "${invitationData.listName}"`,
        text: shareText,
        url: invitationLink,
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return {
          success: true,
          method: "native-share",
          url: invitationLink,
        };
      }
    }

    // Fallback to clipboard
    await navigator.clipboard.writeText(invitationLink);
    return {
      success: true,
      method: "clipboard",
      url: invitationLink,
    };
  } catch (error) {
    console.error("Failed to share invitation link:", error);

    // Ultimate fallback - just return the link
    return {
      success: false,
      method: "manual",
      url: invitationLink,
      error: error.message,
    };
  }
};

/**
 * Send email using EmailJS (client-side email service)
 * @param {Object} emailContent - Email content
 * @param {Object} invitationData - Invitation data
 * @returns {Promise<Object>} EmailJS result
 */
const sendWithEmailJS = async (emailContent, invitationData) => {
  // You'll need to install emailjs: npm install @emailjs/browser
  // Import: import emailjs from '@emailjs/browser';

  const emailjs = window.emailjs; // If loaded via CDN

  if (!emailjs) {
    throw new Error("EmailJS not loaded");
  }

  const templateParams = {
    to_email: invitationData.email,
    to_name: invitationData.email.split("@")[0],
    from_name: invitationData.invitedByName,
    list_name: invitationData.listName,
    role: invitationData.role,
    invitation_link: generateInvitationLink(invitationData),
    message: `You've been invited to collaborate on the list "${invitationData.listName}" as a ${invitationData.role}.`,
  };

  const result = await emailjs.send(
    process.env.REACT_APP_EMAILJS_SERVICE_ID,
    process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
    templateParams,
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY
  );

  return { success: true, service: "emailjs", result };
};

/**
 * Send email through backend API
 * @param {Object} emailContent - Email content
 * @returns {Promise<Object>} Backend API result
 */
const sendWithBackendAPI = async (emailContent) => {
  const response = await fetch("/api/email/send-invitation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send email");
  }

  const result = await response.json();
  return { success: true, service: "backend", result };
};

/**
 * Generate HTML email template
 * @param {Object} invitationData - Invitation data
 * @param {string} invitationLink - Invitation link
 * @returns {string} HTML template
 */
const generateEmailTemplate = (invitationData, invitationLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to collaborate</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 14px; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 You're invited to collaborate!</h1>
            </div>
            <div class="content">
                <p>Hi there!</p>
                
                <p><strong>${
                  invitationData.invitedByName
                }</strong> has invited you to collaborate on the list:</p>
                
                <h2>"${invitationData.listName}"</h2>
                
                <p>You've been invited as a <span class="role-badge">${
                  invitationData.role
                }</span></p>
                
                <p>Click the button below to accept the invitation and start collaborating:</p>
                
                <p style="text-align: center;">
                    <a href="${invitationLink}" class="button">Accept Invitation</a>
                </p>
                
                <p><small>If the button doesn't work, copy and paste this link in your browser:<br>
                <a href="${invitationLink}">${invitationLink}</a></small></p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p><strong>Role Permissions:</strong></p>
                <ul>
                    ${getRolePermissionsHTML(invitationData.role)}
                </ul>
                
                <p><em>This invitation will expire in 7 days.</em></p>
            </div>
            <div class="footer">
                <p>You received this email because ${
                  invitationData.invitedByName
                } invited you to collaborate.<br>
                If you don't want to receive these emails, you can ignore this invitation.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * Generate plain text email template
 * @param {Object} invitationData - Invitation data
 * @param {string} invitationLink - Invitation link
 * @returns {string} Plain text template
 */
const generateTextTemplate = (invitationData, invitationLink) => {
  return `
You're invited to collaborate!

${invitationData.invitedByName} has invited you to collaborate on the list "${
    invitationData.listName
  }".

You've been invited as a ${invitationData.role}.

Accept your invitation by visiting this link:
${invitationLink}

Role Permissions:
${getRolePermissionsText(invitationData.role)}

This invitation will expire in 7 days.

You received this email because ${
    invitationData.invitedByName
  } invited you to collaborate.
If you don't want to receive these emails, you can ignore this invitation.
  `.trim();
};

/**
 * Get role permissions as HTML
 * @param {string} role - User role
 * @returns {string} HTML list items
 */
const getRolePermissionsHTML = (role) => {
  switch (role) {
    case "viewer":
      return "<li>View tasks and activity</li><li>Cannot make changes</li>";
    case "editor":
      return "<li>View tasks and activity</li><li>Create, edit, and delete tasks</li><li>Cannot manage members</li>";
    case "owner":
      return "<li>Full control over the list</li><li>Manage members and permissions</li><li>Can delete the list</li>";
    default:
      return "<li>Basic permissions</li>";
  }
};

/**
 * Get role permissions as plain text
 * @param {string} role - User role
 * @returns {string} Plain text permissions
 */
const getRolePermissionsText = (role) => {
  switch (role) {
    case "viewer":
      return "- View tasks and activity\n- Cannot make changes";
    case "editor":
      return "- View tasks and activity\n- Create, edit, and delete tasks\n- Cannot manage members";
    case "owner":
      return "- Full control over the list\n- Manage members and permissions\n- Can delete the list";
    default:
      return "- Basic permissions";
  }
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Default export for backward compatibility
export default {
  isEmailServiceAvailable,
  sendInvitationEmail,
  shareInvitationLink,
  validateEmail,
};
