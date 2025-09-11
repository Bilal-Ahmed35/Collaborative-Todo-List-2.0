// Updated frontend/src/services/emailService.js

/**
 * Check if email service is available and configured
 * @returns {boolean} True if email service is available
 */
export const isEmailServiceAvailable = () => {
  // Check backend email service availability
  // You can also add frontend EmailJS checks here
  return true; // Assume backend email service is available
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
      Authorization: `Bearer ${localStorage.getItem("authToken")}`, // Fixed token key
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || "Failed to send email");
  }

  const result = await response.json();
  return { success: true, service: "backend", result };
};

/**
 * Send invitation email
 * @param {Object} invitationData - Invitation details
 * @returns {Promise<Object>} Email sending result
 */
export const sendInvitationEmail = async (invitationData) => {
  try {
    const invitationLink = generateInvitationLink(invitationData);

    // Email template
    const emailContent = {
      to: invitationData.email,
      subject: `You're invited to collaborate on "${invitationData.list}"`,
      html: generateEmailTemplate(invitationData, invitationLink),
      text: generateTextTemplate(invitationData, invitationLink),
    };

    // Try backend API first
    try {
      return await sendWithBackendAPI(emailContent);
    } catch (backendError) {
      console.error("Backend email failed:", backendError);

      // If backend fails, try EmailJS as fallback
      if (process.env.REACT_APP_EMAILJS_SERVICE_ID) {
        console.log("Falling back to EmailJS...");
        return await sendWithEmailJS(emailContent, invitationData);
      }

      // If both fail, throw the backend error
      throw backendError;
    }
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
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
 * Share invitation link using native sharing or clipboard
 * @param {Object} invitationData - Invitation details
 * @returns {Promise<Object>} Sharing result
 */
export const shareInvitationLink = async (invitationData) => {
  const invitationLink = generateInvitationLink(invitationData);
  const shareText = `${invitationData.invitedByName} invited you to collaborate on "${invitationData.list}"`;

  try {
    // Try native Web Share API first
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: `Invitation to "${invitationData.list}"`,
        text: shareText,
        url: invitationLink,
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return {
          success: true,
          method: "native-share",
          url: invitationLink,
          message: "Invitation shared successfully!",
        };
      }
    }

    // Fallback to clipboard
    await navigator.clipboard.writeText(invitationLink);
    return {
      success: true,
      method: "clipboard",
      url: invitationLink,
      message: "Invitation link copied to clipboard!",
    };
  } catch (error) {
    console.error("Failed to share invitation link:", error);

    return {
      success: false,
      method: "manual",
      url: invitationLink,
      error: error.message,
      message: "Please copy the link manually.",
    };
  }
};

/**
 * Send email using EmailJS (fallback)
 * @param {Object} emailContent - Email content
 * @param {Object} invitationData - Invitation data
 * @returns {Promise<Object>} EmailJS result
 */
const sendWithEmailJS = async (emailContent, invitationData) => {
  const emailjs = window.emailjs;

  if (!emailjs) {
    throw new Error("EmailJS not loaded");
  }

  const templateParams = {
    to_email: invitationData.email,
    to_name: invitationData.email.split("@")[0],
    from_name: invitationData.invitedByName,
    list_name: invitationData.list,
    role: invitationData.role,
    invitation_link: generateInvitationLink(invitationData),
    message: `You've been invited to collaborate on the list "${invitationData.list}" as a ${invitationData.role}.`,
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>You're invited to collaborate!</h1>
            </div>
            <div class="content">
                <p>Hi there!</p>
                
                <p><strong>${invitationData.invitedByName}</strong> has invited you to collaborate on:</p>
                
                <h2>"${invitationData.list}"</h2>
                
                <p>Role: <strong>${invitationData.role}</strong></p>
                
                <p style="text-align: center;">
                    <a href="${invitationLink}" class="button">Accept Invitation</a>
                </p>
                
                <p>Or copy this link: ${invitationLink}</p>
                
                <p><em>This invitation expires in 7 days.</em></p>
            </div>
            <div class="footer">
                <p>Collaborative Todo App</p>
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

${invitationData.invitedByName} has invited you to collaborate on "${invitationData.list}".

Role: ${invitationData.role}

Accept your invitation: ${invitationLink}

This invitation expires in 7 days.
  `.trim();
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

export default {
  isEmailServiceAvailable,
  sendInvitationEmail,
  shareInvitationLink,
  validateEmail,
};
