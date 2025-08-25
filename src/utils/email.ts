import { Resend } from 'resend';
import { EmailTemplate } from '../types';
import logger from './logger';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'CodeMentor <noreply@codementor.com>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  if (!resend) {
    // In development, log the email content instead of throwing an error
    if (process.env.NODE_ENV === 'development') {
      logger.info('=== EMAIL WOULD BE SENT (RESEND_API_KEY not configured) ===');
      logger.info(`To: ${to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`From: ${fromEmail}`);
      logger.info(`HTML Content: ${html}`);
      if (text) logger.info(`Text Content: ${text}`);
      logger.info('=== END EMAIL CONTENT ===');
      return;
    } else {
      logger.error('Resend API key not configured. Please set RESEND_API_KEY environment variable.');
      throw new Error('Email service not configured. Please contact administrator.');
    }
  }

  // Validate from email format
  const emailRegex = /^(.+)\s*<(.+)>$/;
  const simpleEmailRegex = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;
  
  if (!emailRegex.test(fromEmail) && !simpleEmailRegex.test(fromEmail)) {
    logger.error('Invalid FROM_EMAIL format. Must be "email@domain.com" or "Name <email@domain.com>"');
    throw new Error('Invalid email configuration. Please check FROM_EMAIL format.');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      logger.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
    }

    logger.info('Email sent successfully:', data);
  } catch (error) {
    logger.error('Email sending error:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string): Promise<void> => {
  const subject = 'Welcome to CodeMentor!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to CodeMentor, ${firstName}!</h1>
      <p>Thank you for joining our community of developers and mentors.</p>
      <p>You can now:</p>
      <ul>
        <li>Browse expert mentors in your field</li>
        <li>Schedule coding sessions</li>
        <li>Get help when you're stuck</li>
        <li>Connect with the developer community</li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy coding!</p>
      <p>The CodeMentor Team</p>
    </div>
  `;

  await sendEmail(email, subject, html);
};

export const sendEmailVerification = async (
  email: string,
  firstName: string,
  verificationUrl: string
): Promise<void> => {
  const subject = 'Verify Your Email - CodeMentor';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Verify Your Email</h1>
      <p>Hi ${firstName},</p>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Verify Email
      </a>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
};

export const sendPasswordReset = async (
  email: string,
  firstName: string,
  resetUrl: string
): Promise<void> => {
  const subject = 'Reset Your Password - CodeMentor';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Reset Your Password</h1>
      <p>Hi ${firstName},</p>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Reset Password
      </a>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, subject, html);
};

export const sendSessionConfirmation = async (
  email: string,
  firstName: string,
  sessionDetails: {
    topic: string;
    scheduledAt: Date;
    duration: number;
    mentorName: string;
    meetingLink?: string;
  }
): Promise<void> => {
  const subject = 'Session Confirmed - CodeMentor';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Session Confirmed!</h1>
      <p>Hi ${firstName},</p>
      <p>Your session has been confirmed with ${sessionDetails.mentorName}.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Session Details:</h3>
        <p><strong>Topic:</strong> ${sessionDetails.topic}</p>
        <p><strong>Date:</strong> ${sessionDetails.scheduledAt.toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${sessionDetails.scheduledAt.toLocaleTimeString()}</p>
        <p><strong>Duration:</strong> ${sessionDetails.duration} minutes</p>
        ${sessionDetails.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${sessionDetails.meetingLink}">${sessionDetails.meetingLink}</a></p>` : ''}
      </div>
      <p>Please be ready 5 minutes before the scheduled time.</p>
      <p>Happy coding!</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}; 