// backend/routes/emailRoutes.js
const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Create email transporter
const createTransporter = () => {
  // Option 1: Gmail SMTP
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  // Option 2: Custom SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Option 3: SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransporter({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  throw new Error("No email configuration found");
};

// Send invitation email
router.post("/send-invitation", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        error: "Missing required fields: to, subject",
      });
    }

    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", result.messageId);

    res.json({
      success: true,
      messageId: result.messageId,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email sending failed:", error);

    let errorMessage = "Failed to send email";
    if (error.code === "EAUTH") {
      errorMessage =
        "Email authentication failed. Check your email credentials.";
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        "Failed to connect to email server. Check your SMTP settings.";
    } else if (error.responseCode === 535) {
      errorMessage = "Invalid email credentials. Check username and password.";
    }

    res.status(500).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Test email configuration
router.get("/test", async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    res.json({
      success: true,
      message: "Email configuration is valid",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Email configuration failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
