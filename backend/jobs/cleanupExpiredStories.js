/**
 * Job: Cleanup Expired Stories
 * Deletes stories whose expiresAt has passed and removes Cloudinary assets.
 * Runs every hour via server.js setInterval.
 */

const Story = require('../models/Story');

let cloudinary = null;

function getCloudinary() {
  if (cloudinary) return cloudinary;
  const cv2 = require('cloudinary').v2;
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cv2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cloudinary = cv2;
  }
  return cloudinary;
}

async function cleanupExpiredStories() {
  try {
    const now = new Date();
    const expired = await Story.find({
      expiresAt: { $lte: now }
    }).select('_id media').lean();

    if (expired.length === 0) return { deleted: 0 };

    // Delete Cloudinary assets first (fire-and-forget per story)
    const cl = getCloudinary();
    if (cl) {
      for (const story of expired) {
        const publicId = story.media?.publicId;
        if (publicId) {
          cl.uploader.destroy(publicId, { resource_type: 'video' })
            .catch(() => cl.uploader.destroy(publicId).catch(() => {}));
        }
      }
    }

    const ids = expired.map(s => s._id);
    await Story.deleteMany({ _id: { $in: ids } });

    if (expired.length > 0) {
      console.log(`🗑️  Cleaned up ${expired.length} expired stories`);
    }

    return { deleted: expired.length };
  } catch (error) {
    console.error('Story cleanup job error:', error.message);
    return { deleted: 0, error: error.message };
  }
}

module.exports = { cleanupExpiredStories };
