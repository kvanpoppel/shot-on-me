require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

const getMongoUri = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';

const buildSlugBase = (venueName, fallbackId) => {
  const base = String(venueName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (base) return base;
  return `venue-${String(fallbackId).slice(-6)}`;
};

const buildUniqueSlug = (base, reservedSlugs) => {
  if (!reservedSlugs.has(base)) {
    reservedSlugs.add(base);
    return base;
  }

  let attempt = 2;
  while (attempt < 10000) {
    const candidate = `${base}-${attempt}`;
    if (!reservedSlugs.has(candidate)) {
      reservedSlugs.add(candidate);
      return candidate;
    }
    attempt += 1;
  }

  const fallback = `${base}-${Date.now().toString().slice(-6)}`;
  reservedSlugs.add(fallback);
  return fallback;
};

async function backfillVenueSlugs() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to MongoDB');

    const allVenues = await Venue.find({})
      .select('_id name slug')
      .lean();

    const reservedSlugs = new Set(
      allVenues
        .map((venue) => (venue.slug || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const venuesNeedingSlug = allVenues.filter((venue) => !(venue.slug || '').trim());
    console.log(`Total venues: ${allVenues.length}`);
    console.log(`Venues without slug: ${venuesNeedingSlug.length}`);

    if (venuesNeedingSlug.length === 0) {
      console.log('No backfill needed. All venues already have slugs.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const updates = [];
    const assigned = [];

    for (const venue of venuesNeedingSlug) {
      const base = buildSlugBase(venue.name, venue._id);
      const slug = buildUniqueSlug(base, reservedSlugs);
      updates.push({
        updateOne: {
          filter: { _id: venue._id, $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] },
          update: { $set: { slug } }
        }
      });
      assigned.push({
        id: String(venue._id),
        name: venue.name || '(unnamed venue)',
        slug
      });
    }

    const result = await Venue.bulkWrite(updates, { ordered: true });
    const portalBase = (process.env.VENUE_PORTAL_URL || process.env.VENUE_PORTAL_BASE_URL || 'http://localhost:3002').replace(/\/$/, '');

    console.log(`Updated venues: ${result.modifiedCount || 0}`);
    console.log('');
    console.log('Assigned slug URLs:');
    for (const venue of assigned) {
      console.log(`- ${venue.name} (${venue.id}) -> ${portalBase}/v/${venue.slug}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  }
}

backfillVenueSlugs();

