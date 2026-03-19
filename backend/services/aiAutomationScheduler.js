const Venue = require('../models/Venue')
const { processAutoSuggestions } = require('./aiAutomation')

let schedulerInProgress = false

function isRunDue(lastRunAt, checkIntervalHours) {
  if (!lastRunAt) return true
  const intervalHours = Math.max(1, Number(checkIntervalHours || 24))
  const elapsedMs = Date.now() - new Date(lastRunAt).getTime()
  return elapsedMs >= intervalHours * 60 * 60 * 1000
}

async function runAiAutomationSchedulerCycle() {
  if (schedulerInProgress) {
    return { skipped: true, reason: 'already_running' }
  }

  schedulerInProgress = true

  try {
    const venues = await Venue.find({
      isActive: true,
      'aiAutomation.enabled': true
    }).select('_id name aiAutomation')

    if (!venues.length) {
      return {
        skipped: false,
        processed: 0,
        posted: 0,
        pending: 0,
        totalEligibleVenues: 0
      }
    }

    let processed = 0
    let posted = 0
    let pending = 0
    const failures = []

    for (const venue of venues) {
      const settings = venue.aiAutomation || {}
      if (settings.autoGenerateSpecials === false) continue
      if (!isRunDue(settings.lastRunAt, settings.checkIntervalHours)) continue

      try {
        const threshold = Math.min(Math.max(Number(settings.autoPostThreshold || 0.85), 0.5), 0.99)
        const result = await processAutoSuggestions(venue._id, threshold)

        venue.aiAutomation = {
          enabled: !!settings.enabled,
          autoPostThreshold: threshold,
          autoNotifyFollowers: settings.autoNotifyFollowers !== false,
          autoGenerateSpecials: settings.autoGenerateSpecials !== false,
          checkIntervalHours: Math.max(1, Number(settings.checkIntervalHours || 24)),
          maxPromotionsPerCycle: Math.min(Math.max(Number(settings.maxPromotionsPerCycle || 2), 1), 10),
          lastRunAt: new Date()
        }
        await venue.save()

        processed += 1
        posted += result?.autoPosted?.length || 0
        pending += result?.pending?.length || 0
      } catch (error) {
        failures.push({
          venueId: venue._id.toString(),
          venueName: venue.name,
          error: error.message
        })
        console.error(`AI scheduler: failed venue ${venue._id}:`, error.message)
      }
    }

    return {
      skipped: false,
      processed,
      posted,
      pending,
      totalEligibleVenues: venues.length,
      failures
    }
  } finally {
    schedulerInProgress = false
  }
}

module.exports = {
  runAiAutomationSchedulerCycle
}
