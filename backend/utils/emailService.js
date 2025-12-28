const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

// Initialize email transporter
function initializeEmailService() {
  // For development, use Gmail or another SMTP service
  // For production, consider using SendGrid, AWS SES, or Mailgun
  
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD
    }
  };

  // If no email credentials are provided, create a test account
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('⚠️  No email credentials found. Email sending will be disabled.');
    console.warn('   Set SMTP_USER and SMTP_PASS (or EMAIL_USER and EMAIL_PASS) in .env to enable emails.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email service initialized');
    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error);
    return null;
  }
}

// Initialize on module load
transporter = initializeEmailService();

// Send password reset email
async function sendPasswordResetEmail(email, resetToken) {
  if (!transporter) {
    console.warn('⚠️  Email service not configured. Password reset email not sent.');
    console.warn(`   Reset token (dev only): ${resetToken}`);
    return { success: false, error: 'Email service not configured' };
  }

  const frontendUrl = process.env.FRONTEND_URL || process.env.VENUE_PORTAL_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"Shot On Me" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - Shot On Me',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Shot On Me</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your Shot On Me account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background-color: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #999; font-size: 12px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Shot On Me. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Reset Your Password - Shot On Me
      
      Hello,
      
      We received a request to reset your password for your Shot On Me account.
      
      To reset your password, visit this link:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      © ${new Date().getFullYear()} Shot On Me
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Send invite email
async function sendInviteEmail(recipientEmail, inviterName, inviteLink, referralCode) {
  if (!transporter) {
    console.warn('⚠️  Email service not configured. Invite email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"Shot On Me" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: 'Join me on Shot On Me!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Join Shot On Me</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Shot On Me</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
            
            <p>Hello,</p>
            
            <p><strong>${inviterName || 'Someone'}</strong> invited you to join Shot On Me! Send drinks to friends at any bar or coffee shop.</p>
            
            ${referralCode ? `
            <div style="background: #fff; border: 2px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Referral Code</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #D4AF37; letter-spacing: 2px;">${referralCode}</p>
            </div>
            ` : ''}
            
            <p>Join now and get started:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background-color: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Join Shot On Me
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
              ${inviteLink}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              When you sign up using this link, you both earn rewards!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Shot On Me. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Join me on Shot On Me!
      
      Hello,
      
      ${inviterName || 'Someone'} invited you to join Shot On Me! Send drinks to friends at any bar or coffee shop.
      
      ${referralCode ? `Use my referral code: ${referralCode}\n\n` : ''}Join now and get started: ${inviteLink}
      
      When you sign up using this link, you both earn rewards!
      
      © ${new Date().getFullYear()} Shot On Me
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invite email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send invite email:', error);
    return { success: false, error: error.message };
  }
}

// Test email connection
async function testEmailConnection() {
  if (!transporter) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    await transporter.verify();
    console.log('✅ Email service connection verified');
    return { success: true };
  } catch (error) {
    console.error('❌ Email service connection failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendInviteEmail,
  testEmailConnection,
  initializeEmailService
};


