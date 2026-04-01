const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    console.warn('⚠️ Twilio credentials not configured. SMS notifications will be disabled.');
    console.warn('   Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env');
    return null;
  }

  // Validate Account SID format (must start with "AC")
  if (!accountSid.startsWith('AC')) {
    console.error('❌ Invalid Twilio Account SID format. Account SID must start with "AC".');
    console.error(`   Received: ${accountSid.substring(0, 5)}... (first 5 chars)`);
    console.error('   Please check your TWILIO_ACCOUNT_SID in backend/.env');
    return null;
  }

  // Validate phone number format (should start with +)
  if (!phoneNumber.startsWith('+')) {
    console.error('❌ Invalid Twilio phone number format. Phone number must start with "+".');
    console.error(`   Received: ${phoneNumber}`);
    console.error('   Example: +1234567890');
    console.error('   Please check your TWILIO_PHONE_NUMBER in backend/.env');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio initialized successfully');
    console.log(`   Phone: ${phoneNumber}`);
    return twilioClient;
  } catch (error) {
    console.error('❌ Error initializing Twilio:', error.message);
    console.error('   Please verify your Twilio credentials in backend/.env');
    return null;
  }
};

// Initialize on module load
if (!twilioClient) {
  twilioClient = initializeTwilio();
}

// Re-initialize function for when credentials are updated
const reinitializeTwilio = () => {
  twilioClient = null;
  twilioClient = initializeTwilio();
  return twilioClient;
};

/**
 * Send SMS notification for payment received
 * @param {string} recipientPhone - Recipient's phone number (E.164 format: +1234567890)
 * @param {string} senderName - Name of the person who sent the payment
 * @param {number} amount - Payment amount
 * @param {string|null} redemptionCode - Redemption code (null for money transfers - use tap-and-pay instead)
 * @param {string} message - Optional personal message from sender
 * @returns {Promise<boolean>} - True if SMS sent successfully, false otherwise
 */
const sendPaymentSMS = async (recipientPhone, senderName, amount, redemptionCode = null, message = '') => {
  // Re-initialize if client is null (credentials might have been updated)
  if (!twilioClient) {
    twilioClient = initializeTwilio();
    if (!twilioClient) {
      console.warn('⚠️ Twilio not configured. SMS not sent.');
      return false;
    }
  }

  if (!recipientPhone) {
    console.warn('⚠️ No recipient phone number provided. SMS not sent.');
    return false;
  }

  // Format phone number (ensure it starts with +)
  let formattedPhone = recipientPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    // If no country code, assume US (+1)
    formattedPhone = formattedPhone.replace(/^1/, ''); // Remove leading 1 if present
    formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`; // Remove non-digits and add +1
  }

  // Build SMS message
  const personalMessage = message ? `\n\n"${message}"` : '';
  
  // If redemption code provided (for point/reward system), include it
  // Otherwise, money transfer - use tap-and-pay card
  let smsBody;
  if (redemptionCode) {
    // Redemption code for point/reward system
    smsBody = `🎉 You received $${amount.toFixed(2)} from ${senderName}!${personalMessage}\n\nReward Code: ${redemptionCode}\n\nUse this code at participating venues for points/rewards!\n\nShot On Me`;
  } else {
    // Money transfer - use tap-and-pay card
    smsBody = `🎉 You received $${amount.toFixed(2)} from ${senderName}!${personalMessage}\n\nMoney added to your wallet. Use your tap-and-pay card at any participating venue!\n\nShot On Me`;
  }

  try {
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    const result = await twilioClient.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully to ${formattedPhone}. SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending SMS to ${formattedPhone}:`, error.message);
    // Don't throw - SMS failure shouldn't break payment
    return false;
  }
};

/**
 * Send SMS notification for friend invitation
 * @param {string} recipientPhone - Recipient's phone number
 * @param {string} inviterName - Name of person sending invitation
 * @param {string} inviteLink - App download/invite link
 * @returns {Promise<boolean>}
 */
const sendFriendInviteSMS = async (recipientPhone, inviterName, inviteLink) => {
  // Re-initialize if client is null (credentials might have been updated)
  if (!twilioClient) {
    twilioClient = initializeTwilio();
    if (!twilioClient) {
      console.warn('⚠️ Twilio not configured. SMS not sent.');
      return false;
    }
  }

  if (!recipientPhone) {
    return false;
  }

  let formattedPhone = recipientPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.replace(/^1/, '');
    formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
  }

  const smsBody = `👋 ${inviterName} invited you to join Shot On Me!\n\nDownload the app: ${inviteLink}\n\nSend and receive money with friends at your favorite venues!`;

  try {
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const result = await twilioClient.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`✅ Friend invite SMS sent to ${formattedPhone}. SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending friend invite SMS:`, error.message);
    return false;
  }
};

/**
 * Check if Twilio is configured
 * @returns {boolean}
 */
const isTwilioConfigured = () => {
  return !!twilioClient && 
         !!process.env.TWILIO_ACCOUNT_SID && 
         !!process.env.TWILIO_AUTH_TOKEN && 
         !!process.env.TWILIO_PHONE_NUMBER;
};

/**
 * Send SMS notification for mention in post/comment
 * @param {string} recipientPhone - Recipient's phone number
 * @param {string} mentionerName - Name of person who mentioned them
 * @param {string} contentPreview - Preview of post/comment content
 * @param {string} type - Type: 'post', 'comment', or 'checkin'
 * @param {string} postId - Post ID (optional, for app link)
 * @returns {Promise<boolean>}
 */
const sendMentionSMS = async (recipientPhone, mentionerName, contentPreview, type = 'post', postId = null) => {
  // Re-initialize if client is null
  if (!twilioClient) {
    twilioClient = initializeTwilio();
    if (!twilioClient) {
      console.warn('⚠️ Twilio not configured. SMS not sent.');
      return false;
    }
  }

  if (!recipientPhone) {
    return false;
  }

  let formattedPhone = recipientPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.replace(/^1/, '');
    formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
  }

  const typeLabel = type === 'comment' ? 'a comment' : type === 'checkin' ? 'a check-in' : 'a post';
  const smsBody = `📬 ${mentionerName} mentioned you in ${typeLabel}:\n\n"${contentPreview}"\n\nShot On Me`;

  try {
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const result = await twilioClient.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`✅ Mention SMS sent to ${formattedPhone}. SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending mention SMS:`, error.message);
    return false;
  }
};

/**
 * Send a 2FA OTP for payment verification
 * @param {string} phone - Recipient phone number
 * @param {string} otp - 6-digit code
 * @returns {Promise<boolean>}
 */
const sendPaymentOTP = async (phone, otp) => {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
    if (!twilioClient) return false;
  }
  if (!phone) return false;

  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
  }

  try {
    const result = await twilioClient.messages.create({
      body: `Your Shot On Me payment code is: ${otp}\n\nValid for 10 minutes. Never share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    return !!result.sid;
  } catch (error) {
    console.error('Error sending payment OTP:', error.message);
    return false;
  }
};

// General-purpose SMS sender
const sendSMS = async (phone, body) => {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
    if (!twilioClient) return false;
  }
  if (!phone) return false;
  // Format phone to E.164
  let formatted = phone.replace(/\D/g, '');
  if (formatted.length === 10) formatted = `+1${formatted}`;
  else if (!formatted.startsWith('+')) formatted = `+${formatted}`;
  try {
    const result = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatted
    });
    return !!result.sid;
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return false;
  }
};

module.exports = {
  sendPaymentSMS,
  sendPaymentOTP,
  sendFriendInviteSMS,
  sendMentionSMS,
  sendSMS,
  isTwilioConfigured,
  initializeTwilio,
  reinitializeTwilio
};

