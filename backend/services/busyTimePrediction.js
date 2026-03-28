const mongoose = require('mongoose')
const CheckIn = require('../models/CheckIn')

async function predictBusyTimes(venueId) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const checkIns = await CheckIn.find({
    venue: new mongoose.Types.ObjectId(venueId),
    createdAt: { $gte: ninetyDaysAgo }
  }).select('createdAt').lean()

  const totalCheckIns = checkIns.length

  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const c of checkIns) {
    const d = new Date(c.createdAt)
    const day = d.getDay()
    const hour = d.getHours()
    heatmap[day][hour]++
  }

  const slots = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ day, hour, count: heatmap[day][hour] })
    }
  }

  const sorted = [...slots].sort((a, b) => b.count - a.count)
  const busiestSlots = sorted.slice(0, 5)
  const slowestSlots = sorted.slice(-5).reverse()

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const suggestions = []

  for (const slot of slowestSlots) {
    if (slot.count < 2) {
      const label = `${dayNames[slot.day]} ${slot.hour}:00`
      suggestions.push({
        slot: label,
        type: 'happy_hour',
        message: `Consider a happy hour or flash deal on ${label} to drive traffic during your slowest period.`
      })
    }
  }

  for (const slot of busiestSlots) {
    if (slot.count > 0) {
      const label = `${dayNames[slot.day]} ${slot.hour}:00`
      suggestions.push({
        slot: label,
        type: 'vip_upgrade',
        message: `${label} is your busiest time — offer VIP upgrade pricing or reserve capacity to maximize revenue.`
      })
    }
  }

  return { heatmap, busiestSlots, slowestSlots, suggestions, totalCheckIns }
}

module.exports = { predictBusyTimes }
