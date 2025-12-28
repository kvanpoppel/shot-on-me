/**
 * User Tracking Service
 * Tracks user behavior and preferences for personalized promotions
 */

const User = require('../models/User');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const CheckIn = require('../models/CheckIn');

class UserTrackingService {
  /**
   * Track user interaction with venue
   */
  async trackUserInteraction(userId, venueId, interactionType, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Initialize tracking if not exists
      if (!user.venueInteractions) {
        user.venueInteractions = new Map();
      }

      const venueKey = venueId.toString();
      if (!user.venueInteractions.has(venueKey)) {
        user.venueInteractions.set(venueKey, {
          venueId: venueId,
          firstInteraction: new Date(),
          lastInteraction: new Date(),
          interactions: [],
          preferences: {
            favoritePromotionTypes: [],
            preferredTimeframes: [],
            visitFrequency: 0
          }
        });
      }

      const interaction = user.venueInteractions.get(venueKey);
      interaction.lastInteraction = new Date();
      interaction.interactions.push({
        type: interactionType,
        timestamp: new Date(),
        metadata
      });

      // Update preferences based on interaction
      this.updateUserPreferences(interaction, interactionType, metadata);

      // Save as object (MongoDB doesn't support Map directly)
      const interactionsObj = {};
      user.venueInteractions.forEach((value, key) => {
        interactionsObj[key] = value;
      });
      user.venueInteractions = interactionsObj;

      await user.save();
    } catch (error) {
      console.error('Error tracking user interaction:', error);
    }
  }

  /**
   * Update user preferences based on interactions
   */
  updateUserPreferences(interaction, interactionType, metadata) {
    // Track promotion type preferences
    if (metadata.promotionType) {
      const existing = interaction.preferences.favoritePromotionTypes.find(
        p => p.type === metadata.promotionType
      );
      if (existing) {
        existing.count++;
      } else {
        interaction.preferences.favoritePromotionTypes.push({
          type: metadata.promotionType,
          count: 1
        });
      }
    }

    // Track timeframe preferences
    if (metadata.timeframe) {
      const existing = interaction.preferences.preferredTimeframes.find(
        t => t.timeframe === metadata.timeframe
      );
      if (existing) {
        existing.count++;
      } else {
        interaction.preferences.preferredTimeframes.push({
          timeframe: metadata.timeframe,
          count: 1
        });
      }
    }

    // Update visit frequency
    if (interactionType === 'checkin' || interactionType === 'redemption') {
      interaction.preferences.visitFrequency++;
    }
  }

  /**
   * Get user preferences for a venue
   */
  async getUserPreferences(userId, venueId) {
    try {
      const user = await User.findById(userId).lean();
      if (!user || !user.venueInteractions) return null;

      const venueKey = venueId.toString();
      const interaction = user.venueInteractions[venueKey];
      
      if (!interaction) return null;

      // Get top preferences
      const topPromotionTypes = interaction.preferences.favoritePromotionTypes
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(p => p.type);

      const topTimeframes = interaction.preferences.preferredTimeframes
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
        .map(t => t.timeframe);

      return {
        favoritePromotionTypes: topPromotionTypes,
        preferredTimeframes: topTimeframes,
        visitFrequency: interaction.preferences.visitFrequency,
        lastInteraction: interaction.lastInteraction,
        totalInteractions: interaction.interactions.length
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Get users to target for personalized promotions
   */
  async getTargetUsers(venueId, criteria = {}) {
    try {
      const venue = await Venue.findById(venueId);
      if (!venue) return [];

      const followers = venue.followers || [];
      const targetUsers = [];

      // Get follower data with preferences
      for (const followerId of followers) {
        const user = await User.findById(followerId).lean();
        if (!user) continue;

        const preferences = await this.getUserPreferences(followerId, venueId);
        
        // Check if user matches criteria
        let matches = true;

        if (criteria.promotionType) {
          matches = matches && preferences?.favoritePromotionTypes?.includes(criteria.promotionType);
        }

        if (criteria.timeframe) {
          matches = matches && preferences?.preferredTimeframes?.includes(criteria.timeframe);
        }

        if (criteria.minVisits) {
          matches = matches && (preferences?.visitFrequency || 0) >= criteria.minVisits;
        }

        if (criteria.activeOnly) {
          // Check if user has been active recently (within last 30 days)
          const lastInteraction = preferences?.lastInteraction;
          if (lastInteraction) {
            const daysSince = (new Date() - new Date(lastInteraction)) / (1000 * 60 * 60 * 24);
            matches = matches && daysSince <= 30;
          } else {
            matches = false;
          }
        }

        if (matches) {
          targetUsers.push({
            userId: followerId,
            email: user.email,
            name: user.name || user.firstName,
            preferences,
            matchScore: this.calculateMatchScore(preferences, criteria)
          });
        }
      }

      // Sort by match score
      return targetUsers.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error getting target users:', error);
      return [];
    }
  }

  /**
   * Calculate match score for user targeting
   */
  calculateMatchScore(preferences, criteria) {
    let score = 0;

    if (criteria.promotionType && preferences?.favoritePromotionTypes?.includes(criteria.promotionType)) {
      score += 30;
    }

    if (criteria.timeframe && preferences?.preferredTimeframes?.includes(criteria.timeframe)) {
      score += 30;
    }

    if (criteria.minVisits && preferences?.visitFrequency >= criteria.minVisits) {
      score += 20;
    }

    if (preferences?.lastInteraction) {
      const daysSince = (new Date() - new Date(preferences.lastInteraction)) / (1000 * 60 * 60 * 24);
      if (daysSince <= 7) score += 20;
      else if (daysSince <= 30) score += 10;
    }

    return score;
  }

  /**
   * Track promotion view/click
   */
  async trackPromotionView(userId, venueId, promotionId) {
    await this.trackUserInteraction(userId, venueId, 'promotion_view', {
      promotionId,
      timestamp: new Date()
    });
  }

  /**
   * Track promotion redemption
   */
  async trackPromotionRedemption(userId, venueId, promotionId, amount) {
    await this.trackUserInteraction(userId, venueId, 'promotion_redemption', {
      promotionId,
      amount,
      timestamp: new Date()
    });
  }
}

module.exports = new UserTrackingService();

