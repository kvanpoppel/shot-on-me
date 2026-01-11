const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Extract mentions from text content (e.g., @username, @firstName, @lastName)
 * @param {string} content - Text content to search for mentions
 * @returns {Array<string>} - Array of mention patterns found (without @)
 */
const extractMentions = (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Match @username, @firstname, @lastname patterns (case-insensitive)
  // Allow alphanumeric and underscore, minimum 2 characters
  const mentionRegex = /@(\w{2,})/gi;
  const matches = content.match(mentionRegex);
  
  if (!matches) {
    return [];
  }

  // Extract unique mention strings (remove @ and convert to lowercase)
  const mentions = [...new Set(matches.map(match => match.substring(1).toLowerCase()))];
  return mentions;
};

/**
 * Find users mentioned in content by username, firstName, or lastName
 * @param {string} content - Text content to search for mentions
 * @param {string} excludeUserId - User ID to exclude from results (e.g., post author)
 * @returns {Promise<Array>} - Array of user objects that were mentioned
 */
const findMentionedUsers = async (content, excludeUserId = null) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const mentionStrings = extractMentions(content);
  
  if (mentionStrings.length === 0) {
    return [];
  }

  try {
    // Build query to find users by username, firstName, or lastName
    const query = {
      $or: [
        { username: { $in: mentionStrings } },
        { firstName: { $in: mentionStrings.map(m => m.charAt(0).toUpperCase() + m.slice(1)) } },
        { lastName: { $in: mentionStrings.map(m => m.charAt(0).toUpperCase() + m.slice(1)) } },
        // Also try case-insensitive matching
        { username: { $regex: mentionStrings.join('|'), $options: 'i' } },
        { firstName: { $regex: mentionStrings.join('|'), $options: 'i' } },
        { lastName: { $regex: mentionStrings.join('|'), $options: 'i' } }
      ]
    };

    // Exclude the user who created the post/comment
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const mentionedUsers = await User.find(query)
      .select('_id username firstName lastName phoneNumber email name')
      .limit(50); // Limit to 50 users to prevent abuse

    // Filter to only users that actually match (case-insensitive)
    const normalizedMentions = new Set(mentionStrings.map(m => m.toLowerCase()));
    return mentionedUsers.filter(user => {
      const username = (user.username || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      
      return normalizedMentions.has(username) || 
             normalizedMentions.has(firstName) || 
             normalizedMentions.has(lastName);
    });
  } catch (error) {
    console.error('Error finding mentioned users:', error);
    return [];
  }
};

/**
 * Send SMS notifications to mentioned users
 * @param {Array} mentionedUsers - Array of user objects that were mentioned
 * @param {Object} mentioner - User object who created the post/comment
 * @param {string} content - The post/comment content
 * @param {string} type - Type of mention: 'post', 'comment', or 'checkin'
 * @param {string} postId - Post ID (for links)
 * @returns {Promise<void>}
 */
const sendMentionNotifications = async (mentionedUsers, mentioner, content, type = 'post', postId = null) => {
  if (!mentionedUsers || mentionedUsers.length === 0) {
    return;
  }

  const { sendMentionSMS } = require('./sms');
  const mentionerName = mentioner.firstName || mentioner.name || 'Someone';
  const contentPreview = content.length > 50 ? content.substring(0, 50) + '...' : content;

  // Send SMS to each mentioned user
  const smsPromises = mentionedUsers.map(async (user) => {
    if (!user.phoneNumber) {
      console.log(`⚠️ User ${user._id} mentioned but has no phone number. Skipping SMS.`);
      return;
    }

    try {
      await sendMentionSMS(
        user.phoneNumber,
        mentionerName,
        contentPreview,
        type,
        postId
      );
    } catch (error) {
      console.error(`❌ Failed to send mention SMS to ${user._id}:`, error);
      // Don't throw - SMS failure shouldn't break the operation
    }
  });

  await Promise.all(smsPromises);
};

/**
 * Create in-app notifications for mentioned users
 * @param {Array} mentionedUsers - Array of user objects that were mentioned
 * @param {string} mentionerId - User ID who created the post/comment
 * @param {string} content - The post/comment content
 * @param {string} type - Type of mention: 'post', 'comment', or 'checkin'
 * @param {string} postId - Post ID (if applicable)
 * @returns {Promise<void>}
 */
const createMentionNotifications = async (mentionedUsers, mentionerId, content, type = 'post', postId = null) => {
  if (!mentionedUsers || mentionedUsers.length === 0) {
    return;
  }

  const Notification = require('../models/Notification');
  const mentioner = await User.findById(mentionerId).select('firstName name');
  const mentionerName = mentioner?.firstName || mentioner?.name || 'Someone';
  const contentPreview = content.length > 50 ? content.substring(0, 50) + '...' : content;

  const notificationPromises = mentionedUsers.map(async (user) => {
    // Skip if user is the mentioner
    if (user._id.toString() === mentionerId.toString()) {
      return;
    }

    try {
      const notification = new Notification({
        recipient: user._id,
        actor: mentionerId,
        type: 'mention',
        content: `${mentionerName} mentioned you in a ${type}: "${contentPreview}"`,
        relatedPost: postId || null
      });

      await notification.save();

      // Emit real-time notification
      // Get io from server module
      try {
        const serverModule = require('../server');
        const io = serverModule?.io;
        if (io) {
          io.to(user._id.toString()).emit('new-notification', {
            notification: notification,
            message: notification.content,
            postId: postId
          });
        }
      } catch (err) {
        // io not available, skip real-time notification
        // This is non-critical - notifications will still be saved
      }
    } catch (error) {
      console.error(`❌ Failed to create mention notification for ${user._id}:`, error);
      // Don't throw - notification failure shouldn't break the operation
    }
  });

  await Promise.all(notificationPromises);
};

/**
 * Process mentions in post/comment content - sends SMS and creates in-app notifications
 * @param {string} content - Text content to search for mentions
 * @param {string} mentionerId - User ID who created the post/comment
 * @param {string} type - Type: 'post', 'comment', or 'checkin'
 * @param {string} postId - Post ID (if applicable)
 * @returns {Promise<void>}
 */
const processMentions = async (content, mentionerId, type = 'post', postId = null) => {
  if (!content || typeof content !== 'string') {
    return;
  }

  try {
    // Find mentioned users
    const mentionedUsers = await findMentionedUsers(content, mentionerId);

    if (mentionedUsers.length === 0) {
      return;
    }

    console.log(`📬 Found ${mentionedUsers.length} mention(s) in ${type}:`, mentionedUsers.map(u => u.username || u.firstName || u._id));

    // Get mentioner info for notifications
    const mentioner = await User.findById(mentionerId).select('firstName lastName name');

    // Send SMS notifications (async, don't wait)
    sendMentionNotifications(mentionedUsers, mentioner, content, type, postId).catch(err => {
      console.error('Error sending mention SMS:', err);
    });

    // Create in-app notifications
    await createMentionNotifications(mentionedUsers, mentionerId, content, type, postId);
  } catch (error) {
    console.error('Error processing mentions:', error);
    // Don't throw - mention processing failure shouldn't break post/comment creation
  }
};

module.exports = {
  extractMentions,
  findMentionedUsers,
  sendMentionNotifications,
  createMentionNotifications,
  processMentions
};
