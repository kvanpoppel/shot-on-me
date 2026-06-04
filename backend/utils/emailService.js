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

// Send invite email (no referral code – link uses user ID, backend attributes referral)
async function sendInviteEmail(recipientEmail, inviterName, inviteLink) {
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
      
      Join now and get started: ${inviteLink}
      
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

async function sendVenueRequestAdminEmail(adminEmail, venueData) {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  const mailOptions = {
    from: `"Shot On Me" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `New Venue Request: ${venueData.venueName}`,
    html: `<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:24px;border-radius:10px;margin-bottom:20px">
        <h1 style="color:#D4AF37;margin:0;font-size:24px">Shot On Me</h1>
        <p style="color:#999;margin:4px 0 0;font-size:14px">New Venue Request</p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:10px;border:1px solid #e0e0e0">
        <h2 style="margin-top:0">📍 ${venueData.venueName}</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:130px">Type</td><td style="font-weight:bold">${venueData.venueType}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Location</td><td style="font-weight:bold">${venueData.city}, ${venueData.state}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Address</td><td>${venueData.address}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Owner</td><td>${venueData.ownerName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${venueData.email}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Phone</td><td>${venueData.phone}</td></tr>
          ${venueData.website ? `<tr><td style="padding:6px 0;color:#666">Website</td><td>${venueData.website}</td></tr>` : ''}
        </table>
        ${venueData.description ? `<p style="margin-top:16px;font-size:13px;color:#555;font-style:italic">"${venueData.description}"</p>` : ''}
        ${venueData.photoUrl ? `<img src="${venueData.photoUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-top:16px" />` : ''}
        <div style="text-align:center;margin-top:24px">
          <a href="https://owner.shotonme.com/dashboard/pending-venues" style="display:inline-block;background:#D4AF37;color:#000;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none">Review Request</a>
        </div>
      </div>
    </body>`,
    text: `New venue request: ${venueData.venueName} in ${venueData.city}, ${venueData.state}. Owner: ${venueData.ownerName} (${venueData.email}). Log in to owner.shotonme.com to review.`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send venue request admin email:', error);
    return { success: false, error: error.message };
  }
}

async function sendVenueApprovalEmail(ownerEmail, ownerName, venueName, resetToken) {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  const setPasswordUrl = resetToken
    ? `https://venue.shotonme.com/set-password?token=${resetToken}`
    : 'https://venue.shotonme.com';
  const ctaText = resetToken ? 'Set Your Password & Get Started' : 'Sign In to Your Dashboard';
  const passwordNote = resetToken
    ? `<p style="color:#666;font-size:13px">Login email: <strong>${ownerEmail}</strong><br>This link expires in 72 hours.</p>`
    : `<p style="color:#666;font-size:13px">Login email: <strong>${ownerEmail}</strong><br>Use "Forgot Password" if you need to set your password.</p>`;
  const mailOptions = {
    from: `"Shot On Me" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: ownerEmail,
    subject: `🎉 ${venueName} has been approved on Shot On Me!`,
    html: `<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:24px;border-radius:10px;margin-bottom:20px">
        <h1 style="color:#D4AF37;margin:0;font-size:24px">Shot On Me</h1>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:10px;border:1px solid #e0e0e0">
        <h2 style="margin-top:0">Congratulations, ${ownerName}! 🎉</h2>
        <p>Your venue <strong>${venueName}</strong> has been approved and is now live on Shot On Me.</p>
        <p>Set your password below and you'll be ready to create your first deal in under 2 minutes.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${setPasswordUrl}" style="display:inline-block;background:#D4AF37;color:#000;padding:14px 32px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:16px">${ctaText}</a>
        </div>
        ${passwordNote}
      </div>
    </body>`,
    text: `Congratulations! Your venue ${venueName} has been approved on Shot On Me. Set your password at ${setPasswordUrl} to get started.`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send venue approval email:', error);
    return { success: false, error: error.message };
  }
}

async function sendVenueDenialEmail(ownerEmail, ownerName, venueName, note) {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  const mailOptions = {
    from: `"Shot On Me" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: ownerEmail,
    subject: `Update on your Shot On Me venue request`,
    html: `<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:24px;border-radius:10px;margin-bottom:20px">
        <h1 style="color:#D4AF37;margin:0;font-size:24px">Shot On Me</h1>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:10px;border:1px solid #e0e0e0">
        <h2 style="margin-top:0">Hi ${ownerName},</h2>
        <p>Thank you for your interest in bringing <strong>${venueName}</strong> to Shot On Me.</p>
        <p>After reviewing your request, we're unable to approve your venue at this time.</p>
        ${note ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:14px;border-radius:6px;margin:16px 0"><p style="margin:0;font-size:14px;color:#856404"><strong>Note:</strong> ${note}</p></div>` : ''}
        <p style="color:#666;font-size:13px">Questions? Email <a href="mailto:shotonme@yahoo.com">shotonme@yahoo.com</a></p>
      </div>
    </body>`,
    text: `Hi ${ownerName}, we were unable to approve your venue ${venueName} at this time.${note ? ` Note: ${note}` : ''} Questions? Email shotonme@yahoo.com.`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send venue denial email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send weekly venue digest email
 */
async function sendVenueWeeklyDigest(email, data) {
  if (!transporter) return { success: false, error: 'Email not configured' };

  const { venueName, followerCount, followersGained, somRevenue, totalRedemptions, bestDeal, weekStart, weekEnd } = data;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #fff; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1510, #0a0a0a); padding: 32px 24px 24px;">
        <p style="font-size: 12px; color: #B8945A; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px;">Weekly Digest</p>
        <h1 style="font-size: 22px; margin: 0; color: #fff;">${venueName}</h1>
        <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 6px 0 0;">${weekStart} — ${weekEnd}</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">Followers</p>
              <p style="font-size: 20px; font-weight: 800; color: #fff; margin: 4px 0 0;">${followerCount}${followersGained > 0 ? ` <span style="font-size: 12px; color: #4ade80;">+${followersGained} this week</span>` : ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">Revenue via Shot On Me</p>
              <p style="font-size: 20px; font-weight: 800; color: #fff; margin: 4px 0 0;">$${somRevenue.toFixed(2)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">Redemptions</p>
              <p style="font-size: 20px; font-weight: 800; color: #fff; margin: 4px 0 0;">${totalRedemptions}</p>
            </td>
          </tr>
          ${bestDeal ? `
          <tr>
            <td style="padding: 12px 0;">
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">Best Deal This Week</p>
              <p style="font-size: 16px; font-weight: 700; color: #B8945A; margin: 4px 0 0;">${bestDeal.title}</p>
              <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin: 2px 0 0;">$${bestDeal.revenue.toFixed(2)} in transactions</p>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      <div style="padding: 0 24px 32px; text-align: center;">
        <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin: 0;">Shot On Me · Venue Analytics</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: `${venueName} — Weekly Digest`,
    html,
    text: `${venueName} Weekly Digest (${weekStart} - ${weekEnd})\n\nFollowers: ${followerCount} (+${followersGained})\nSOM Revenue: $${somRevenue.toFixed(2)}\nRedemptions: ${totalRedemptions}\n${bestDeal ? `Best Deal: ${bestDeal.title} ($${bestDeal.revenue.toFixed(2)})` : ''}`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send weekly digest:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendInviteEmail,
  testEmailConnection,
  initializeEmailService,
  sendVenueRequestAdminEmail,
  sendVenueApprovalEmail,
  sendVenueDenialEmail,
  sendVenueWeeklyDigest
};


