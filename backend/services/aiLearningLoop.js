/**
 * AI Learning Feedback Loop
 *
 * Runs weekly (every Monday at 3am). For each venue:
 *  1. Analyzes AI-generated promotions from the last 14 days
 *  2. Computes true ROI metrics per promotion type
 *  3. Stores learned weights in venue.aiLearning
 *  4. These weights are used by generatePromotionSuggestions() to boost
 *     confidence on historically well-performing types
 *
 * Metrics tracked per promotion type:
 *  - avgRedemptionRate  = redemptions / max(views, 1)
 *  - avgRevenuePerView  = revenue / max(views, 1)
 *  - avgClickRate       = clicks / max(views, 1)
 *  - sampleCount        = number of promotions of this type evaluated
 */

const Venue = require('../models/Venue');

// Promotion types we track
const PROMO_TYPES = ['happy-hour', 'special', 'flash-deal', 'event', 'exclusive', 'birthday', 'other'];

// Baseline performance (used when no data yet)
const BASELINE = {
  avgRedemptionRate: 0.05,
  avgRevenuePerView: 0.10,
  avgClickRate: 0.15
};

async function runAiLearningLoop() {
  let venuesProcessed = 0;
  let venuesWithData = 0;

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Process venues in batches to avoid memory pressure
    const cursor = Venue.find({ isActive: true }).select('_id name promotions aiLearning').cursor();

    for await (const venue of cursor) {
      venuesProcessed++;
      const promos = (venue.promotions || []).filter(p => {
        const created = p.createdAt || p.startTime;
        return created && new Date(created) >= fourteenDaysAgo && p.analytics?.views > 0;
      });

      if (promos.length === 0) continue;
      venuesWithData++;

      // Group by type
      const byType = {};
      for (const type of PROMO_TYPES) {
        byType[type] = { redemptionRates: [], revenuePerViews: [], clickRates: [], count: 0 };
      }

      for (const p of promos) {
        const t = p.type || 'other';
        const bucket = byType[t] || byType['other'];
        const views = Math.max(1, p.analytics.views || 0);
        bucket.redemptionRates.push((p.analytics.redemptions || 0) / views);
        bucket.revenuePerViews.push((p.analytics.revenue || 0) / views);
        bucket.clickRates.push((p.analytics.clicks || 0) / views);
        bucket.count++;
      }

      const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

      // Build performance weights (relative to baseline)
      const typePerformance = {};
      let bestType = null;
      let bestScore = -1;

      for (const type of PROMO_TYPES) {
        const b = byType[type];
        if (b.count === 0) continue;

        const redemptionRate = avg(b.redemptionRates);
        const revenuePerView = avg(b.revenuePerViews);
        const clickRate = avg(b.clickRates);

        // Composite score (weighted: redemptions 50%, revenue 30%, clicks 20%)
        const score = (redemptionRate / BASELINE.avgRedemptionRate) * 0.5 +
                      (revenuePerView / BASELINE.avgRevenuePerView) * 0.3 +
                      (clickRate / BASELINE.avgClickRate) * 0.2;

        typePerformance[type] = {
          avgRedemptionRate: Math.round(redemptionRate * 1000) / 1000,
          avgRevenuePerView: Math.round(revenuePerView * 1000) / 1000,
          avgClickRate: Math.round(clickRate * 1000) / 1000,
          score: Math.round(score * 100) / 100,
          sampleCount: b.count
        };

        if (score > bestScore) {
          bestScore = score;
          bestType = type;
        }
      }

      if (Object.keys(typePerformance).length === 0) continue;

      // Best day of week from recent promos (by redemption count)
      const dayBuckets = {};
      for (const p of promos) {
        const date = p.createdAt || p.startTime;
        if (!date) continue;
        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        dayBuckets[day] = (dayBuckets[day] || 0) + (p.analytics?.redemptions || 0);
      }
      const bestDay = Object.keys(dayBuckets).length
        ? Object.keys(dayBuckets).reduce((a, b) => dayBuckets[a] > dayBuckets[b] ? a : b)
        : null;

      // Best hour
      const hourBuckets = {};
      for (const p of promos) {
        const t = p.startTime;
        if (!t) continue;
        const hour = new Date(t).getHours();
        hourBuckets[hour] = (hourBuckets[hour] || 0) + (p.analytics?.redemptions || 0);
      }
      const bestHour = Object.keys(hourBuckets).length
        ? parseInt(Object.keys(hourBuckets).reduce((a, b) => hourBuckets[a] > hourBuckets[b] ? a : b))
        : null;

      // Save learned data
      await Venue.updateOne(
        { _id: venue._id },
        {
          $set: {
            'aiLearning.typePerformance': typePerformance,
            'aiLearning.bestType': bestType,
            'aiLearning.bestDay': bestDay,
            'aiLearning.bestHour': bestHour,
            'aiLearning.promotionsAnalyzed': promos.length,
            'aiLearning.lastTrainedAt': new Date()
          }
        }
      );
    }

    console.log(`[AILearning] Done: ${venuesProcessed} venues scanned, ${venuesWithData} with data`);
    return { venuesProcessed, venuesWithData };
  } catch (error) {
    console.error('[AILearning] Loop error:', error.message);
    throw error;
  }
}

/**
 * Given a venue's aiLearning data, return a confidence multiplier for a promo type.
 * Used by generatePromotionSuggestions() to adjust confidence scores.
 *
 * @param {Object} aiLearning - venue.aiLearning
 * @param {string} promoType  - e.g. 'happy-hour'
 * @returns {number} multiplier between 0.7 and 1.3
 */
function getConfidenceMultiplier(aiLearning, promoType) {
  if (!aiLearning?.typePerformance?.[promoType]) return 1.0;
  const score = aiLearning.typePerformance[promoType].score || 1.0;
  // Clamp to ±30% adjustment
  return Math.min(1.3, Math.max(0.7, score));
}

module.exports = { runAiLearningLoop, getConfidenceMultiplier };
