/**
 * AI Analytics Service
 * Provides intelligent recommendations for promotional strategies based on:
 * - Day of week patterns
 * - Demographic data
 * - Historical performance
 * - Timeframe optimization
 */

const Venue = require('../models/Venue');
const User = require('../models/User');
const Payment = require('../models/Payment');

class AIAnalyticsService {
  /**
   * Analyze promotion performance and recommend optimal strategies
   */
  async analyzePromotionPerformance(venueId, timeRange = 30) {
    try {
      const venue = await Venue.findById(venueId).lean();
      if (!venue) {
        throw new Error('Venue not found');
      }

      const promotions = venue.promotions || [];
      const now = new Date();
      const startDate = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);

      // Get payment/redemption data
      const payments = await Payment.find({
        venue: venueId,
        status: 'redeemed',
        redeemedAt: { $gte: startDate }
      }).lean();

      // Analyze day-of-week patterns
      const dayOfWeekAnalysis = this.analyzeDayOfWeekPatterns(promotions, payments);
      
      // Analyze demographic patterns
      const demographicAnalysis = await this.analyzeDemographicPatterns(venueId, payments);
      
      // Analyze timeframe effectiveness
      const timeframeAnalysis = this.analyzeTimeframeEffectiveness(promotions, payments);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        dayOfWeekAnalysis,
        demographicAnalysis,
        timeframeAnalysis,
        promotions
      );

      return {
        dayOfWeekAnalysis,
        demographicAnalysis,
        timeframeAnalysis,
        recommendations,
        summary: {
          totalPromotions: promotions.length,
          activePromotions: promotions.filter(p => p.isActive).length,
          totalRedemptions: payments.length,
          averageRevenue: payments.length > 0 
            ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length 
            : 0
        }
      };
    } catch (error) {
      console.error('Error analyzing promotion performance:', error);
      throw error;
    }
  }

  /**
   * Analyze day-of-week patterns
   */
  analyzeDayOfWeekPatterns(promotions, payments) {
    const dayStats = {
      sunday: { redemptions: 0, revenue: 0, promotions: 0 },
      monday: { redemptions: 0, revenue: 0, promotions: 0 },
      tuesday: { redemptions: 0, revenue: 0, promotions: 0 },
      wednesday: { redemptions: 0, revenue: 0, promotions: 0 },
      thursday: { redemptions: 0, revenue: 0, promotions: 0 },
      friday: { redemptions: 0, revenue: 0, promotions: 0 },
      saturday: { redemptions: 0, revenue: 0, promotions: 0 }
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Analyze payments by day of week
    payments.forEach(payment => {
      if (payment.redeemedAt) {
        const day = new Date(payment.redeemedAt).getDay();
        const dayName = dayNames[day];
        if (dayStats[dayName]) {
          dayStats[dayName].redemptions++;
          dayStats[dayName].revenue += payment.amount || 0;
        }
      }
    });

    // Analyze promotions by day of week
    promotions.forEach(promo => {
      if (promo.schedule && Array.isArray(promo.schedule)) {
        promo.schedule.forEach(sched => {
          const days = (sched.days || '').toLowerCase();
          dayNames.forEach(dayName => {
            if (days.includes(dayName)) {
              dayStats[dayName].promotions++;
            }
          });
        });
      }
    });

    // Calculate performance scores
    const dayPerformance = Object.entries(dayStats).map(([day, stats]) => {
      const performanceScore = (stats.redemptions * 0.5) + (stats.revenue / 100) + (stats.promotions * 0.3);
      return {
        day,
        ...stats,
        performanceScore: Math.round(performanceScore * 100) / 100,
        recommendation: this.getDayRecommendation(day, stats, performanceScore)
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      dayPerformance,
      bestDays: dayPerformance.slice(0, 3).map(d => d.day),
      worstDays: dayPerformance.slice(-2).map(d => d.day)
    };
  }

  /**
   * Get recommendation for specific day
   */
  getDayRecommendation(day, stats, score) {
    if (score > 50) {
      return {
        type: 'increase',
        message: `${day.charAt(0).toUpperCase() + day.slice(1)} is performing well. Consider adding more promotions or extending hours.`,
        action: 'add_promotions'
      };
    } else if (score < 20) {
      return {
        type: 'improve',
        message: `${day.charAt(0).toUpperCase() + day.slice(1)} has low activity. Try targeted promotions or special events.`,
        action: 'targeted_promotions'
      };
    } else {
      return {
        type: 'maintain',
        message: `${day.charAt(0).toUpperCase() + day.slice(1)} performance is moderate. Maintain current strategy.`,
        action: 'maintain'
      };
    }
  }

  /**
   * Analyze demographic patterns
   */
  async analyzeDemographicPatterns(venueId, payments) {
    const demographicData = {
      ageGroups: { '18-25': 0, '26-35': 0, '36-45': 0, '46+': 0 },
      genders: { male: 0, female: 0, other: 0 },
      userTypes: { regular: 0, vip: 0, new: 0 }
    };

    // Get user data for payments
    const userIds = [...new Set(payments.map(p => p.recipient).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('birthDate gender checkIns friends')
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    payments.forEach(payment => {
      const user = userMap.get(payment.recipient?.toString());
      if (user) {
        // Age group
        if (user.birthDate) {
          const age = new Date().getFullYear() - new Date(user.birthDate).getFullYear();
          if (age >= 18 && age <= 25) demographicData.ageGroups['18-25']++;
          else if (age >= 26 && age <= 35) demographicData.ageGroups['26-35']++;
          else if (age >= 36 && age <= 45) demographicData.ageGroups['36-45']++;
          else if (age >= 46) demographicData.ageGroups['46+']++;
        }

        // Gender
        if (user.gender) {
          const gender = user.gender.toLowerCase();
          if (demographicData.genders[gender] !== undefined) {
            demographicData.genders[gender]++;
          }
        }

        // User type
        const checkInCount = user.checkIns?.length || 0;
        if (checkInCount === 0) demographicData.userTypes.new++;
        else if (checkInCount >= 5) demographicData.userTypes.vip++;
        else demographicData.userTypes.regular++;
      }
    });

    // Find dominant demographics
    const topAgeGroup = Object.entries(demographicData.ageGroups)
      .sort((a, b) => b[1] - a[1])[0];
    const topGender = Object.entries(demographicData.genders)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      demographics: demographicData,
      topAgeGroup: topAgeGroup ? { group: topAgeGroup[0], count: topAgeGroup[1] } : null,
      topGender: topGender ? { gender: topGender[0], count: topGender[1] } : null,
      recommendations: this.getDemographicRecommendations(demographicData)
    };
  }

  /**
   * Get demographic-based recommendations
   */
  getDemographicRecommendations(demographics) {
    const recommendations = [];

    // Age-based recommendations
    const topAge = Object.entries(demographics.ageGroups)
      .sort((a, b) => b[1] - a[1])[0];
    if (topAge && topAge[1] > 0) {
      if (topAge[0] === '18-25') {
        recommendations.push({
          type: 'age_targeting',
          message: 'Your primary audience is 18-25. Consider social media-focused promotions and group deals.',
          target: '18-25',
          promotionTypes: ['happy-hour', 'flash-deal', 'group-special']
        });
      } else if (topAge[0] === '26-35') {
        recommendations.push({
          type: 'age_targeting',
          message: 'Your primary audience is 26-35. Focus on quality experiences and loyalty programs.',
          target: '26-35',
          promotionTypes: ['special', 'exclusive', 'loyalty-reward']
        });
      }
    }

    // Gender-based recommendations
    const topGender = Object.entries(demographics.genders)
      .sort((a, b) => b[1] - a[1])[0];
    if (topGender && topGender[1] > 0) {
      recommendations.push({
        type: 'gender_targeting',
        message: `Your audience is ${topGender[0]}-dominant. Consider gender-specific events or promotions.`,
        target: topGender[0],
        promotionTypes: ['event', 'special']
      });
    }

    return recommendations;
  }

  /**
   * Analyze timeframe effectiveness
   */
  analyzeTimeframeEffectiveness(promotions, payments) {
    const timeSlots = {
      morning: { start: 6, end: 12, redemptions: 0, revenue: 0 },
      afternoon: { start: 12, end: 17, redemptions: 0, revenue: 0 },
      evening: { start: 17, end: 22, redemptions: 0, revenue: 0 },
      night: { start: 22, end: 6, redemptions: 0, revenue: 0 }
    };

    // Analyze payments by time
    payments.forEach(payment => {
      if (payment.redeemedAt) {
        const hour = new Date(payment.redeemedAt).getHours();
        let slot = 'evening'; // default
        
        if (hour >= 6 && hour < 12) slot = 'morning';
        else if (hour >= 12 && hour < 17) slot = 'afternoon';
        else if (hour >= 17 && hour < 22) slot = 'evening';
        else slot = 'night';

        if (timeSlots[slot]) {
          timeSlots[slot].redemptions++;
          timeSlots[slot].revenue += payment.amount || 0;
        }
      }
    });

    // Calculate effectiveness scores
    const slotPerformance = Object.entries(timeSlots).map(([slot, data]) => {
      const effectiveness = (data.redemptions * 2) + (data.revenue / 50);
      return {
        slot,
        ...data,
        effectiveness: Math.round(effectiveness * 100) / 100,
        recommendation: this.getTimeframeRecommendation(slot, data, effectiveness)
      };
    }).sort((a, b) => b.effectiveness - a.effectiveness);

    return {
      timeSlots: slotPerformance,
      bestTimeframe: slotPerformance[0]?.slot,
      recommendations: slotPerformance.map(s => s.recommendation)
    };
  }

  /**
   * Get timeframe recommendation
   */
  getTimeframeRecommendation(slot, data, effectiveness) {
    const slotNames = {
      morning: 'Morning (6 AM - 12 PM)',
      afternoon: 'Afternoon (12 PM - 5 PM)',
      evening: 'Evening (5 PM - 10 PM)',
      night: 'Night (10 PM - 6 AM)'
    };

    if (effectiveness > 30) {
      return {
        type: 'optimal',
        message: `${slotNames[slot]} is your best performing timeframe. Maximize promotions during this period.`,
        action: 'increase_promotions',
        timeframe: slot
      };
    } else if (effectiveness < 10) {
      return {
        type: 'improve',
        message: `${slotNames[slot]} has low activity. Consider special promotions to boost traffic.`,
        action: 'targeted_promotions',
        timeframe: slot
      };
    } else {
      return {
        type: 'maintain',
        message: `${slotNames[slot]} performance is moderate.`,
        action: 'maintain',
        timeframe: slot
      };
    }
  }

  /**
   * Generate comprehensive recommendations
   */
  generateRecommendations(dayAnalysis, demographicAnalysis, timeframeAnalysis, promotions) {
    const recommendations = [];

    // Day-of-week recommendations
    if (dayAnalysis.bestDays.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'day_of_week',
        title: 'Optimize Best Performing Days',
        description: `Focus promotions on ${dayAnalysis.bestDays.join(', ')} for maximum impact.`,
        action: 'schedule_promotions',
        data: { days: dayAnalysis.bestDays }
      });
    }

    // Demographic recommendations
    if (demographicAnalysis.recommendations.length > 0) {
      demographicAnalysis.recommendations.forEach(rec => {
        recommendations.push({
          priority: 'medium',
          category: 'demographic',
          title: rec.type === 'age_targeting' ? 'Age-Based Targeting' : 'Gender-Based Targeting',
          description: rec.message,
          action: 'create_targeted_promotion',
          data: { target: rec.target, promotionTypes: rec.promotionTypes }
        });
      });
    }

    // Timeframe recommendations
    if (timeframeAnalysis.bestTimeframe) {
      recommendations.push({
        priority: 'high',
        category: 'timeframe',
        title: 'Optimize Best Timeframe',
        description: `Your ${timeframeAnalysis.bestTimeframe} timeframe performs best. Schedule more promotions during this period.`,
        action: 'schedule_timeframe_promotions',
        data: { timeframe: timeframeAnalysis.bestTimeframe }
      });
    }

    // Promotion type recommendations
    const activePromos = promotions.filter(p => p.isActive);
    const promoTypePerformance = {};
    activePromos.forEach(promo => {
      const type = promo.type || 'other';
      if (!promoTypePerformance[type]) {
        promoTypePerformance[type] = {
          count: 0,
          views: promo.analytics?.views || 0,
          redemptions: promo.analytics?.redemptions || 0
        };
      }
      promoTypePerformance[type].count++;
    });

    const bestType = Object.entries(promoTypePerformance)
      .sort((a, b) => (b[1].redemptions / b[1].views) - (a[1].redemptions / a[1].views))[0];

    if (bestType && bestType[1].views > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'promotion_type',
        title: 'Best Performing Promotion Type',
        description: `${bestType[0]} promotions have the highest conversion rate. Consider creating more of this type.`,
        action: 'create_promotion',
        data: { type: bestType[0] }
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get optimal deal recommendations for specific timeframe
   */
  async getOptimalDealsForTimeframe(venueId, timeframe = 'evening', dayOfWeek = null) {
    try {
      const venue = await Venue.findById(venueId).lean();
      if (!venue) {
        throw new Error('Venue not found');
      }

      const promotions = venue.promotions || [];
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const payments = await Payment.find({
        venue: venueId,
        status: 'redeemed',
        redeemedAt: { $gte: startDate }
      }).lean();

      // Filter promotions by timeframe
      const timeframePromotions = promotions.filter(promo => {
        if (!promo.schedule || !Array.isArray(promo.schedule)) return false;
        
        return promo.schedule.some(sched => {
          const startHour = sched.start ? parseInt(sched.start.split(':')[0]) : 0;
          const endHour = sched.end ? parseInt(sched.end.split(':')[0]) : 23;
          
          const timeframeHours = {
            morning: [6, 12],
            afternoon: [12, 17],
            evening: [17, 22],
            night: [22, 6]
          };
          
          const [tfStart, tfEnd] = timeframeHours[timeframe] || [17, 22];
          
          // Check if promotion time overlaps with timeframe
          if (tfEnd > tfStart) {
            return startHour >= tfStart && endHour <= tfEnd;
          } else {
            // Handle night slot (22-6)
            return startHour >= tfStart || endHour <= tfEnd;
          }
        });
      });

      // Analyze performance
      const dealPerformance = timeframePromotions.map(promo => {
        const analytics = promo.analytics || {};
        const conversionRate = analytics.views > 0 
          ? (analytics.redemptions / analytics.views) * 100 
          : 0;
        const revenuePerView = analytics.views > 0 
          ? (analytics.revenue || 0) / analytics.views 
          : 0;

        return {
          promotionId: promo._id,
          title: promo.title,
          type: promo.type,
          discount: promo.discount,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenuePerView: Math.round(revenuePerView * 100) / 100,
          totalRevenue: analytics.revenue || 0,
          totalRedemptions: analytics.redemptions || 0,
          score: (conversionRate * 0.6) + (revenuePerView * 0.4)
        };
      }).sort((a, b) => b.score - a.score);

      return {
        timeframe,
        dayOfWeek,
        recommendedDeals: dealPerformance.slice(0, 5),
        insights: {
          bestDeal: dealPerformance[0] || null,
          averageConversionRate: dealPerformance.length > 0
            ? dealPerformance.reduce((sum, d) => sum + d.conversionRate, 0) / dealPerformance.length
            : 0,
          totalDeals: dealPerformance.length
        }
      };
    } catch (error) {
      console.error('Error getting optimal deals:', error);
      throw error;
    }
  }
}

module.exports = new AIAnalyticsService();

