'use strict';
const https = require('https');
const ALLOWED_STATES = new Set(['IN']);
function lookupState(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) return resolve(null);
    const req = https.get(`https://ip-api.com/json/${ip}?fields=status,regionCode`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { const json = JSON.parse(data); resolve(json.status === 'success' ? json.regionCode : null); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}
async function geoRestrict(req, res, next) {
  if (process.env.ALLOW_ALL_STATES === 'true') return next();
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
  let stateCode = null;
  try { stateCode = await lookupState(ip); } catch { return next(); }
  if (stateCode === null) return next();
  if (!ALLOWED_STATES.has(stateCode)) {
    return res.status(403).json({ error: 'Service not available in your location', message: 'Shot On Me is currently available in Indiana only.', state: stateCode });
  }
  return next();
}
module.exports = { geoRestrict, ALLOWED_STATES };
