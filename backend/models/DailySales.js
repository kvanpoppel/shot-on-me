const mongoose = require('mongoose');

const dailySalesSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  totalSales: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One entry per venue per day
dailySalesSchema.index({ venue: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailySales', dailySalesSchema);
