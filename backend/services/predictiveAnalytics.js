/**
 * Predictive Analytics Service
 * Forecasts future performance and suggests optimal strategies
 */

const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const CheckIn = require('../models/CheckIn');

class PredictiveAnalyticsService {
  /**
   * Predict future revenue based on historical data
   */
  async predictRevenue(venueId, daysAhead = 7) {
    try {
      const venue = await Venue.findById(venueId).lean();
      if (!venue) throw new Error('Venue not found');

      const now = new Date();
      const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Last 60 days

      // Get historical payment data
      const payments = await Payment.find({
        venue: venueId,
        status: 'redeemed',
        redeemedAt: { $gte: startDate }
      }).sort({ redeemedAt: 1 }).lean();

      if (payments.length === 0) {
        return {
          predictedRevenue: 0,
          confidence: 0,
          trend: 'insufficient_data',
          message: 'Not enough historical data for prediction'
        };
      }

      // Calculate daily averages
      const dailyRevenue = {};
      payments.forEach(payment => {
        const date = new Date(payment.redeemedAt).toDateString();
        if (!dailyRevenue[date]) {
          dailyRevenue[date] = { total: 0, count: 0 };
        }
        dailyRevenue[date].total += payment.amount || 0;
        dailyRevenue[date].count++;
      });

      const dailyAverages = Object.values(dailyRevenue).map(d => d.total / d.count);
      const avgDailyRevenue = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;

      // Calculate trend (simple linear regression)
      const days = Object.keys(dailyRevenue).length;
      let trend = 'stable';
      if (days >= 7) {
        const recent = dailyAverages.slice(-7);
        const older = dailyAverages.slice(0, -7);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0 
          ? older.reduce((a, b) => a + b, 0) / older.length 
          : recentAvg;
        
        if (recentAvg > olderAvg * 1.1) trend = 'increasing';
        else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
      }

      // Predict future revenue
      const predictedRevenue = avgDailyRevenue * daysAhead;
      const confidence = Math.min(95, Math.max(50, days * 2)); // More data = higher confidence

      // Day-of-week adjustments
      const dayOfWeekMultipliers = this.calculateDayOfWeekMultipliers(payments);
      const adjustedPrediction = this.adjustForDayOfWeek(
        predictedRevenue,
        daysAhead,
        dayOfWeekMultipliers
      );

      return {
        predictedRevenue: Math.round(adjustedPrediction * 100) / 100,
        confidence: Math.round(confidence),
        trend,
        dailyAverage: Math.round(avgDailyRevenue * 100) / 100,
        dayOfWeekMultipliers,
        recommendations: this.getRevenueRecommendations(trend, avgDailyRevenue)
      };
    } catch (error) {
      console.error('Error predicting revenue:', error);
      throw error;
    }
  }

  /**
   * Calculate day-of-week multipliers
   */
  calculateDayOfWeekMultipliers(payments) {
    const dayStats = {
      0: { total: 0, count: 0 }, // Sunday
      1: { total: 0, count: 0 }, // Monday
      2: { total: 0, count: 0 }, // Tuesday
      3: { total: 0, count: 0 }, // Wednesday
      4: { total: 0, count: 0 }, // Thursday
      5: { total: 0, count: 0 }, // Friday
      6: { total: 0, count: 0 }  // Saturday
    };

    payments.forEach(payment => {
      if (payment.redeemedAt) {
        const day = new Date(payment.redeemedAt).getDay();
        dayStats[day].total += payment.amount || 0;
        dayStats[day].count++;
      }
    });

    // Calculate averages
    const averages = {};
    Object.keys(dayStats).forEach(day => {
      const stats = dayStats[day];
      averages[day] = stats.count > 0 ? stats.total / stats.count : 0;
    });

    // Calculate overall average
    const overallAvg = Object.values(averages).reduce((a, b) => a + b, 0) / 7;

    // Calculate multipliers
    const multipliers = {};
    Object.keys(averages).forEach(day => {
      multipliers[day] = overallAvg > 0 ? averages[day] / overallAvg : 1;
    });

    return multipliers;
  }

  /**
   * Adjust prediction for day of week
   */
  adjustForDayOfWeek(predictedRevenue, daysAhead, multipliers) {
    const now = new Date();
    let adjusted = 0;

    for (let i = 0; i < daysAhead; i++) {
      const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const day = futureDate.getDay();
      const multiplier = multipliers[day] || 1;
      adjusted += (predictedRevenue / daysAhead) * multiplier;
    }

    return adjusted;
  }

  /**
   * Get revenue recommendations
   */
  getRevenueRecommendations(trend, avgDailyRevenue) {
    const recommendations = [];

    if (trend === 'decreasing') {
      recommendations.push({
        priority: 'high',
        title: 'Revenue Trend Declining',
        message: 'Your revenue is trending downward. Consider launching new promotions or events.',
        action: 'create_promotion'
      });
    } else if (trend === 'increasing') {
      recommendations.push({
        priority: 'medium',
        title: 'Revenue Trend Increasing',
        message: 'Great! Your revenue is trending upward. Consider expanding successful promotions.',
        action: 'expand_promotions'
      });
    }

    if (avgDailyRevenue < 50) {
      recommendations.push({
        priority: 'high',
        title: 'Low Daily Revenue',
        message: 'Your average daily revenue is below optimal. Focus on attracting more customers.',
        action: 'boost_traffic'
      });
    }

    return recommendations;
  }

  /**
   * Predict optimal promotion timing
   */
  async predictOptimalTiming(venueId, promotionType) {
    try {
      const venue = await Venue.findById(venueId).lean();
      if (!venue) throw new Error('Venue not found');

      const promotions = venue.promotions || [];
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const payments = await Payment.find({
        venue: venueId,
        status: 'redeemed',
        redeemedAt: { $gte: startDate }
      }).lean();

      // Analyze best times for this promotion type
      const typePromotions = promotions.filter(p => p.type === promotionType);
      const typePayments = payments.filter(p => {
        // Match payments to promotions (simplified)
        return true; // In real implementation, link payments to specific promotions
      });

      // Find best day and time
      const timeAnalysis = this.analyzeOptimalTimes(typePayments);

      return {
        bestDay: timeAnalysis.bestDay,
        bestTimeframe: timeAnalysis.bestTimeframe,
        expectedEngagement: timeAnalysis.expectedEngagement,
        confidence: timeAnalysis.confidence
      };
    } catch (error) {
      console.error('Error predicting optimal timing:', error);
      throw error;
    }
  }

  /**
   * Analyze optimal times
   */
  analyzeOptimalTimes(payments) {
    const dayStats = {};
    const timeStats = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    payments.forEach(payment => {
      if (payment.redeemedAt) {
        const date = new Date(payment.redeemedAt);
        const day = date.getDay();
        const hour = date.getHours();

        dayStats[day] = (dayStats[day] || 0) + 1;

        if (hour >= 6 && hour < 12) timeStats.morning++;
        else if (hour >= 12 && hour < 17) timeStats.afternoon++;
        else if (hour >= 17 && hour < 22) timeStats.evening++;
        else timeStats.night++;
      }
    });

    const bestDay = Object.keys(dayStats).reduce((a, b) => 
      dayStats[a] > dayStats[b] ? a : b
    );

    const bestTimeframe = Object.keys(timeStats).reduce((a, b) =>
      timeStats[a] > timeStats[b] ? a : b
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      bestDay: dayNames[parseInt(bestDay)],
      bestTimeframe,
      expectedEngagement: Math.max(...Object.values(timeStats)),
      confidence: payments.length > 10 ? 85 : 60
    };
  }

  /**
   * Forecast customer lifetime value
   */
  async forecastCLV(venueId, userId) {
    try {
      const payments = await Payment.find({
        venue: venueId,
        recipient: userId,
        status: 'redeemed'
      }).sort({ redeemedAt: 1 }).lean();

      if (payments.length === 0) {
        return {
          clv: 0,
          visitFrequency: 0,
          averageSpend: 0,
          predictedFutureValue: 0
        };
      }

      const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const firstPayment = payments[0];
      const lastPayment = payments[payments.length - 1];
      const daysActive = (new Date(lastPayment.redeemedAt) - new Date(firstPayment.redeemedAt)) / (1000 * 60 * 60 * 24);
      const visitFrequency = daysActive > 0 ? payments.length / (daysActive / 30) : 0; // visits per month

      const averageSpend = totalSpent / payments.length;
      const monthsActive = Math.max(1, daysActive / 30);
      const monthlyValue = totalSpent / monthsActive;

      // Predict future value (next 12 months)
      const predictedFutureValue = monthlyValue * 12 * 0.7; // 70% retention assumption

      return {
        clv: Math.round(totalSpent * 100) / 100,
        visitFrequency: Math.round(visitFrequency * 100) / 100,
        averageSpend: Math.round(averageSpend * 100) / 100,
        predictedFutureValue: Math.round(predictedFutureValue * 100) / 100,
        monthsActive: Math.round(monthsActive * 10) / 10
      };
    } catch (error) {
      console.error('Error forecasting CLV:', error);
      throw error;
    }
  }
}

module.exports = new PredictiveAnalyticsService();

