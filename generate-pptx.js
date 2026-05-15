const PptxGenJS = require('./docgen/node_modules/pptxgenjs')
const pptx = new PptxGenJS()
pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5

// SOM Colors — black and gold, always
const BG    = '080604'
const GOLD  = 'B8945A'
const GOLD2 = 'C9A875'
const GOLD3 = '9A7A4A'
const CREAM = 'E8DCC4'
const WHITE = 'FFFFFF'
const DIM   = '7D6139'

// Revig Colors
const FZ_BG   = '0F0F1E'
const FZ_LIME = 'C8F135'
const FZ_CORAL= 'FF5F57'
const FZ_CYAN = '00D4FF'

const W = 13.33
const H = 7.5
const L = 0.65 // left margin

// ── Bubble layout — mirrored from LoginScreen.tsx ────
// size in px → converted to inches (/96), left in % of W, y scattered across H
const BUBBLES = [
  { size:5,  left:4  }, { size:8,  left:9  }, { size:4,  left:15 },
  { size:11, left:21 }, { size:5,  left:28 }, { size:6,  left:34 },
  { size:9,  left:40 }, { size:4,  left:46 }, { size:7,  left:52 },
  { size:5,  left:58 }, { size:10, left:63 }, { size:4,  left:69 },
  { size:8,  left:74 }, { size:6,  left:79 }, { size:12, left:84 },
  { size:5,  left:89 }, { size:7,  left:93 }, { size:4,  left:11 },
  { size:6,  left:37 }, { size:9,  left:55 }, { size:5,  left:72 },
  { size:7,  left:96 },
]
// Pseudo-random y positions (deterministic so every slide looks same)
const BUBBLE_Y = [0.8,2.1,5.2,1.4,6.1,3.3,4.7,0.5,6.8,2.9,1.1,5.6,3.8,7.0,0.3,4.2,2.5,6.3,1.7,5.0,3.1,4.5]

function addBubbles(s) {
  BUBBLES.forEach((b, i) => {
    const diameter = (b.size / 96) * 2.2
    const x = (b.left / 100) * W - diameter / 2
    const y = BUBBLE_Y[i % BUBBLE_Y.length] % H
    s.addShape(pptx.ShapeType.ellipse, {
      x, y, w: diameter, h: diameter,
      fill: { type: 'solid', color: 'B8945A', transparency: 93 },
      line: { color: 'B8945A', pt: 0.5, transparency: 85 }
    })
  })
}

// ── Helpers ───────────────────────────────────

function base(s) {
  s.background = { color: BG }
  addBubbles(s)
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.08, fill: { color: GOLD } })
}

function tag(s, txt) {
  s.addText(txt.toUpperCase(), {
    x: L, y: 0.2, w: W - L * 2, h: 0.32,
    fontSize: 10, bold: true, color: GOLD3,
    charSpacing: 4, fontFace: 'Inter'
  })
}

function title(s, txt, y, size) {
  s.addText(txt, {
    x: L, y: y || 0.65, w: W - L * 2, h: 2.8,
    fontSize: size || 42, bold: true,
    color: WHITE, fontFace: 'Inter', valign: 'top'
  })
}

function rule(s, y) {
  s.addShape(pptx.ShapeType.rect, { x: L, y, w: W - L * 2, h: 0.03, fill: { color: GOLD3 } })
}

function body(s, txt, y, size) {
  s.addText(txt, {
    x: L, y, w: W - L * 2, h: 1.0,
    fontSize: size || 18, color: CREAM,
    fontFace: 'Inter', valign: 'top'
  })
}

// Bullet: bold gold label + cream body text
function bul(s, label, text, y, x, w) {
  const parts = []
  if (label) parts.push({ text: label + '   ', options: { bold: true, fontSize: 18, color: GOLD2, fontFace: 'Inter' } })
  if (text)  parts.push({ text: text,          options: { fontSize: 18, color: CREAM,  fontFace: 'Inter' } })
  s.addText(parts, { x: x || L, y, w: w || (W - L * 2), h: 0.58 })
  return y + 0.68
}

// ════════════════════════════════════════════
// SLIDE 1 — TITLE
// ════════════════════════════════════════════
const s1 = pptx.addSlide()
base(s1)

s1.addText('Shot On Me', {
  x: L, y: 0.7, w: 9.5, h: 2.8,
  fontSize: 96, bold: true, color: GOLD, fontFace: 'Dancing Script'
})
s1.addText('Business Plan', {
  x: L, y: 3.5, w: 9.5, h: 0.9,
  fontSize: 36, bold: true, color: WHITE, fontFace: 'Inter'
})
rule(s1, 4.52)
s1.addText('The social payment network for bars & nightlife.', {
  x: L, y: 4.7, w: 9.5, h: 0.6,
  fontSize: 20, color: CREAM, fontFace: 'Inter'
})
s1.addText('Presented to Counsel  ·  Confidential', {
  x: L, y: 5.4, w: 9.5, h: 0.5,
  fontSize: 15, color: DIM, fontFace: 'Inter', italic: true
})
s1.addText('shotonme.com', {
  x: L, y: 6.8, w: 9.5, h: 0.4,
  fontSize: 13, color: DIM, fontFace: 'Inter'
})

s1.addShape(pptx.ShapeType.rect, { x: 10.3, y: 0.08, w: 3.03, h: H - 0.08, fill: { color: '100D02' } })
s1.addText('Send the\nmoment.\nTap to\nspend.', {
  x: 10.3, y: 1.5, w: 3.03, h: 5,
  fontSize: 28, bold: true, color: GOLD2,
  fontFace: 'Inter', align: 'center', valign: 'middle', lineSpacingMultiple: 1.3
})

// ════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ════════════════════════════════════════════
const s2 = pptx.addSlide()
base(s2)
tag(s2, 'The Problem')

title(s2, 'Buying a drink for someone is broken.\nSo is spending the money once received.', 0.65, 36)

rule(s2, 3.15)

s2.addText('Problem 1  —  No way to send a drink with intent', {
  x: L, y: 3.35, w: W - L * 2, h: 0.5, fontSize: 16, bold: true, color: GOLD2, fontFace: 'Inter'
})
body(s2, 'You must be physically present — or send money on Venmo with no guarantee it goes toward a drink. There is no way to send a specific drink to someone, remotely, in real time, with intention attached.', 3.88, 16)

s2.addText('Problem 2  —  Venmo & PayPal fail at the point of sale', {
  x: L, y: 4.95, w: W - L * 2, h: 0.5, fontSize: 16, bold: true, color: GOLD2, fontFace: 'Inter'
})
body(s2, 'Transferring money to a bank takes 1–3 business days. Instant transfer charges the recipient a fee just to access money someone gifted them. The funds sit idle and the moment is gone.', 5.48, 16)

// ════════════════════════════════════════════
// SLIDE 3 — THE SOLUTION
// ════════════════════════════════════════════
const s3 = pptx.addSlide()
base(s3)
tag(s3, 'The Solution')

title(s3, 'Shot On Me closes the loop\nnobody else has built.', 0.65, 40)

rule(s3, 2.55)

s3.addText('One app connects the social moment, the payment, and the venue — end to end.', {
  x: L, y: 2.72, w: W - L * 2, h: 0.6, fontSize: 19, bold: true, color: WHITE, fontFace: 'Inter'
})

const steps3 = [
  ['01', 'Send a Drink',          'Choose a friend, a dollar amount, a reason, or a specific drink.'],
  ['02', 'Instant Notification',  'Recipient gets an immediate text or in-app alert with your message.'],
  ['03', 'Tap & Pay',             'They tap their phone at the bar\'s existing NFC terminal. Done.'],
  ['04', 'The Moment Lives On',   'Posts to the feed, earns points, builds profile history.'],
]
steps3.forEach((st, i) => {
  const x = L + i * 3.05
  s3.addShape(pptx.ShapeType.rect, { x, y: 3.5, w: 2.9, h: 3.6, fill: { color: '130F03' } })
  s3.addShape(pptx.ShapeType.rect, { x, y: 3.5, w: 2.9, h: 0.06, fill: { color: GOLD } })
  s3.addText(st[0], { x: x+0.2, y: 3.7,  w: 2.5, h: 0.6, fontSize: 26, bold: true, color: GOLD, fontFace: 'Inter' })
  s3.addText(st[1], { x: x+0.2, y: 4.35, w: 2.5, h: 0.65, fontSize: 15, bold: true, color: WHITE, fontFace: 'Inter' })
  s3.addText(st[2], { x: x+0.2, y: 5.05, w: 2.5, h: 1.8,  fontSize: 14, color: CREAM, fontFace: 'Inter', valign: 'top' })
})

// ════════════════════════════════════════════
// SLIDE 4 — VIRTUAL CARD
// ════════════════════════════════════════════
const s4 = pptx.addSlide()
base(s4)
tag(s4, 'The Wallet & Virtual Card')

title(s4, 'A real virtual card — issued\nthe moment you sign up.', 0.65, 40)

rule(s4, 2.55)

body(s4, 'Powered by Stripe Issuing. A real Visa card, virtual, instant, and loaded directly into Apple Pay and Google Pay at account creation. No approval process. No physical card. No waiting.', 2.72, 17)

let y4 = 3.95
y4 = bul(s4, 'Instant Activation', 'Card is issued and ready to use the moment an account is created — no approval needed.', y4)
y4 = bul(s4, '100% Virtual', 'Lives in Apple Pay and Google Pay. No physical card is ever issued or required.', y4)
y4 = bul(s4, 'Works Anywhere', 'Compatible with any NFC payment terminal in the US today. Venues need zero new hardware.', y4)
y4 = bul(s4, 'Rewards Spend Instantly', 'Every dollar sent hits your wallet instantly — with the intention still attached. No transfers. No waiting. Just tap and spend.', y4)

// ════════════════════════════════════════════
// SLIDE 5 — SOCIAL + AI
// ════════════════════════════════════════════
const s5 = pptx.addSlide()
base(s5)
tag(s5, 'Social Platform & AI')

title(s5, 'Shot On Me is a full social\nplatform — not just a payment app.', 0.65, 36)

rule(s5, 2.55)

// Left
s5.addText('Social Features', { x: L, y: 2.72, w: 5.9, h: 0.5, fontSize: 20, bold: true, color: GOLD, fontFace: 'Inter' })
const socL = [
  ['Feed-First Social', 'Every drink sent, every check-in, every deal redeemed posts to the feed automatically. Friends see it, react to it, and send the next one.'],
  ['Points on Every Action', 'Send a drink, check in, refer a friend — every action earns points. 100 points = $5 back in your wallet.'],
  ['Round Mode', 'Buy a drink for the entire table in a single transaction.'],
  ['Find Friends & Invite', 'Invite friends via text, discover who\'s nearby, and grow your circle — all inside the app.'],
]
let yL = 3.28
socL.forEach(([lb, b]) => { yL = bul(s5, lb, b, yL, L, 5.9) })

s5.addShape(pptx.ShapeType.rect, { x: 7.05, y: 2.65, w: 0.03, h: 4.5, fill: { color: GOLD3 } })

// Right
s5.addText('AI & Personalization', { x: 7.3, y: 2.72, w: 5.7, h: 0.5, fontSize: 20, bold: true, color: GOLD, fontFace: 'Inter' })
const socR = [
  ['"For You" Venues', 'AI matches venues to each user\'s stated preferences in real time.'],
  ['"My Vibe" Profile', 'Users set preferences: dogs, live music, trivia, BYOB, and more.'],
  ['Feed Ranking', 'AI surfaces posts from people and venues each user engages with most.'],
  ['Predictive Analytics', 'Venue operators see who is likely to return and when.'],
]
let yR = 3.28
socR.forEach(([lb, b]) => { yR = bul(s5, lb, b, yR, 7.3, 5.7) })

// ════════════════════════════════════════════
// SLIDE 6 — FOR VENUES
// ════════════════════════════════════════════
const s6 = pptx.addSlide()
base(s6)
tag(s6, 'For Venue Owners')

title(s6, 'Sign up. Get a dashboard.\nStart earning. Zero setup.', 0.65, 38)

rule(s6, 2.55)

body(s6, 'The Venue Portal gives every venue a live business intelligence platform — real-time alerts, deal creation, and earnings tracking across both Shot On Me and Revig. Free to start. No hardware, no POS integration, no technical setup.', 2.72, 16)

let y6 = 3.75
y6 = bul(s6, 'Real-Time Alerts', 'Instant toast notifications when someone sends a drink, checks in, or pays — not a 30-second poll.', y6)
y6 = bul(s6, 'Deal Wizard', '4-step promotion builder: pick a type, set the schedule, target your audience, preview and publish in under a minute.', y6)
y6 = bul(s6, 'SOM + Revig Earnings', 'Revenue split by platform so you see exactly which app drives your business. One dashboard for both.', y6)
y6 = bul(s6, 'Vibe Profile', 'Venues set amenities — dogs, trivia, live music, BYOB — and get matched to the right users automatically.', y6)
y6 = bul(s6, 'Tiered Access', 'Free tier: 1 active deal, basic stats. Paid tiers unlock AI insights, unlimited deals, smart promo generator, and follower analytics.', y6)
y6 = bul(s6, 'Direct Payouts', 'Stripe Connect deposits earnings straight to the venue\'s bank. No invoicing. No waiting.', y6)

// ════════════════════════════════════════════
// SLIDE 7 — COMPETITIVE TABLE
// ════════════════════════════════════════════
const s7 = pptx.addSlide()
base(s7)
tag(s7, 'Competitive Advantage')

title(s7, 'Every existing platform\nfalls short at a critical step.', 0.65, 40)

rule(s7, 2.55)

const cols7 = [
  { t: 'Platform',                x: L,    w: 3.3  },
  { t: 'Send a drink?',           x: 4.1,  w: 2.2  },
  { t: 'Spend instantly, free?',  x: 6.4,  w: 2.5  },
  { t: 'Social layer?',           x: 9.0,  w: 2.0  },
  { t: 'Venue data?',             x: 11.1, w: 2.0  },
]
cols7.forEach(c => {
  s7.addText(c.t, { x: c.x, y: 2.72, w: c.w, h: 0.42, fontSize: 12, bold: true, color: GOLD3, fontFace: 'Inter', align: c.x === L ? 'left' : 'center' })
})
s7.addShape(pptx.ShapeType.rect, { x: L, y: 3.16, w: W - L * 2, h: 0.025, fill: { color: GOLD3 } })

const rows7 = [
  ['Venmo / PayPal',     ['No', 'No', 'No', 'No'],    false],
  ['Cash App',           ['No', 'No', 'No', 'No'],    false],
  ['Instagram / TikTok', ['No', 'No', 'Yes','No'],    false],
  ['Apple / Google Pay', ['No', 'Yes','No', 'No'],    false],
  ['Shot On Me',         ['Yes','Yes','Yes','Yes'],   true ],
]
rows7.forEach(([name, checks, hl], i) => {
  const y = 3.25 + i * 0.72
  if (hl) s7.addShape(pptx.ShapeType.rect, { x: L - 0.1, y: y - 0.04, w: W - L * 2 + 0.2, h: 0.72, fill: { color: '1A1408' } })
  s7.addText(name, { x: L, y, w: 3.3, h: 0.62, fontSize: 16, bold: hl, color: hl ? GOLD : CREAM, fontFace: 'Inter', valign: 'middle' })
  const xs7 = [4.1, 6.4, 9.0, 11.1]
  const ws7 = [2.2, 2.5, 2.0, 2.0 ]
  checks.forEach((ck, ci) => {
    s7.addText(ck, { x: xs7[ci], y, w: ws7[ci], h: 0.62, fontSize: 15, bold: ck === 'Yes' && hl, color: ck === 'Yes' ? GOLD2 : GOLD3, fontFace: 'Inter', align: 'center', valign: 'middle' })
  })
  if (!hl && i < rows7.length - 2) s7.addShape(pptx.ShapeType.rect, { x: L, y: y + 0.66, w: W - L * 2, h: 0.015, fill: { color: '1A1408' } })
})

// ════════════════════════════════════════════
// SLIDE 8 — BUSINESS MODEL
// ════════════════════════════════════════════
const s8 = pptx.addSlide()
base(s8)
tag(s8, 'Business Model')

s8.addText('Users pay nothing. Ever.', {
  x: L, y: 0.65, w: W - L * 2, h: 1.2,
  fontSize: 54, bold: true, color: GOLD, fontFace: 'Inter'
})
s8.addText('Five revenue streams — all from venues and the platform. Never from end users.', {
  x: L, y: 1.85, w: W - L * 2, h: 0.6, fontSize: 19, bold: true, color: WHITE, fontFace: 'Inter'
})

rule(s8, 2.57)

let y8 = 2.78
y8 = bul(s8, 'Venue Subscriptions', 'Free ($0) \u2192 Growth ($79/mo) \u2192 Performance ($199/mo) \u2192 Enterprise (custom). Each tier unlocks AI, analytics, unlimited deals, and automation. Primary recurring revenue.', y8)
y8 = bul(s8, 'Card Interchange', 'Every tap-to-pay swipe on the Shot On Me virtual card earns interchange revenue via Stripe Issuing. Scales with every transaction across both SOM and Revig.', y8)
y8 = bul(s8, 'Per-Transaction Fee', 'Small platform fee on every drink or Revig sent — paid by the venue, never the user. Two apps means two revenue channels from one venue.', y8)
y8 = bul(s8, 'Promoted Placement', 'Venues pay to feature deals at the top of the discovery feed and map — like a sponsored listing, tied to real foot traffic data.', y8)
y8 = bul(s8, 'Convention Pipeline', 'Nightclub & Bar Show, NRA Show, and regional restaurant expos drive direct venue acquisition — each signup feeds recurring subscription revenue.', y8)

// ════════════════════════════════════════════
// SLIDE 9 — MARKET
// ════════════════════════════════════════════
const s9 = pptx.addSlide()
base(s9)
tag(s9, 'Market Opportunity')

title(s9, 'A massive market with\nno dominant player.', 0.65, 42)

rule(s9, 2.55)

const stats9 = [
  ['$36.4B', 'US Bar & Nightclub Industry',    'Annual market size — no app owns the social payment layer today. (IBISWorld, 2024)'],
  ['$2.8T',  'Global P2P Payments Market',     'Venmo leads — but fails every time someone tries to spend at the point of sale. (Grand View Research, 2023)'],
  ['80%+',   'NFC Terminal Penetration',        'Of US point-of-sale terminals accept contactless today. Shot On Me works with every one. (Visa, 2024)'],
  ['73%',    'Prefer Experiences Over Products','Of Americans prioritize experiences and want to share them — not just transfer a number. (Bankrate, 2023)'],
]
stats9.forEach((st, i) => {
  const col = i % 2, row = Math.floor(i / 2)
  const x = col === 0 ? L : 7.1
  const y = 2.78 + row * 2.1
  s9.addText(st[0], { x, y, w: 5.8, h: 1.05, fontSize: 60, bold: true, color: GOLD, fontFace: 'Inter' })
  s9.addText(st[1], { x, y: y + 1.08, w: 5.8, h: 0.48, fontSize: 16, bold: true, color: WHITE, fontFace: 'Inter' })
  s9.addText(st[2], { x, y: y + 1.58, w: 5.8, h: 0.42, fontSize: 13, color: CREAM, fontFace: 'Inter' })
})
s9.addShape(pptx.ShapeType.rect, { x: 6.85, y: 2.65, w: 0.03, h: 4.5, fill: { color: GOLD3 } })

// ════════════════════════════════════════════
// SLIDE 10 — VENUE OPPORTUNITY
// ════════════════════════════════════════════
const s10 = pptx.addSlide()
base(s10)
tag(s10, 'The Venue Opportunity')

title(s10, 'The market is massive.\nThe venues are ready.', 0.65, 42)

rule(s10, 2.55)

const stats10 = [
  ['660K',   'Restaurant & Foodservice Locations', 'Active venues across the US — each one a potential Shot On Me partner. (NRA, 2024)'],
  ['61K+',   'Bars & Nightclubs in the US',        'The core Shot On Me target vertical — with no social payment app serving them today. (IBISWorld, 2024)'],
  ['$182/mo','Avg. Monthly Bar & Dining Spend',    'Per US consumer — a market already conditioned to spend, looking for better experiences. (LendingTree, 2023)'],
  ['57%',    'Mobile Payment Adoption',             'Of US consumers used mobile payments in the past year. The behavior is already here. (McKinsey, 2023)'],
]
stats10.forEach((st, i) => {
  const col = i % 2, row = Math.floor(i / 2)
  const x = col === 0 ? L : 7.1
  const y = 2.78 + row * 2.1
  s10.addText(st[0], { x, y, w: 5.8, h: 1.05, fontSize: 56, bold: true, color: GOLD, fontFace: 'Inter' })
  s10.addText(st[1], { x, y: y + 1.08, w: 5.8, h: 0.48, fontSize: 16, bold: true, color: WHITE, fontFace: 'Inter' })
  s10.addText(st[2], { x, y: y + 1.58, w: 5.8, h: 0.42, fontSize: 13, color: CREAM, fontFace: 'Inter' })
})
s10.addShape(pptx.ShapeType.rect, { x: 6.85, y: 2.65, w: 0.03, h: 4.5, fill: { color: GOLD3 } })

// ════════════════════════════════════════════
// SLIDE 11 — THE OPPORTUNITY (Revig branding)
// ════════════════════════════════════════════
const s11 = pptx.addSlide()
s11.background = { color: FZ_BG }
s11.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.08, fill: { color: FZ_LIME } })

s11.addText('THE OPPORTUNITY', {
  x: L, y: 0.22, w: W - L * 2, h: 0.38,
  fontSize: 11, bold: true, color: FZ_LIME, fontFace: 'Inter', charSpacing: 5
})
s11.addText('A generation is moving away from alcohol.\nThe market built for them is just getting started.', {
  x: L, y: 0.65, w: W - L * 2, h: 1.55,
  fontSize: 34, bold: true, color: WHITE, fontFace: 'Inter', lineSpacingMultiple: 1.15
})
s11.addShape(pptx.ShapeType.rect, { x: L, y: 2.32, w: W - L * 2, h: 0.03, fill: { color: FZ_LIME } })

// 3-column stat layout with vertical dividers
const colW11 = (W - L * 2) / 3
const cols11 = [
  { num: '41%',    label: 'of adults under 35\ndon\'t drink alcohol', source: 'Gallup, 2023',       color: FZ_LIME  },
  { num: '35%',    label: 'non-alcoholic beverage\ncategory growth YoY',  source: 'NielsenIQ, 2023',  color: FZ_CORAL },
  { num: '$48.4B', label: 'US coffee shop market\n— growing every year',  source: 'IBISWorld, 2024',  color: FZ_CYAN  },
]
cols11.forEach((c, i) => {
  const x = L + i * colW11
  s11.addText(c.num, { x, y: 2.55, w: colW11, h: 1.3, fontSize: 64, bold: true, color: c.color, fontFace: 'Inter' })
  s11.addText(c.label, { x, y: 3.9, w: colW11 - 0.3, h: 0.88, fontSize: 16, bold: true, color: WHITE, fontFace: 'Inter' })
  s11.addText(c.source, { x, y: 4.82, w: colW11, h: 0.35, fontSize: 12, color: '555577', fontFace: 'Inter', italic: true })
  if (i < 2) s11.addShape(pptx.ShapeType.rect, { x: x + colW11 - 0.02, y: 2.45, w: 0.03, h: 2.9, fill: { color: '252542' } })
})

// Bottom callout — dirty soda / refresher tea data
s11.addShape(pptx.ShapeType.rect, { x: L, y: 5.5, w: W - L * 2, h: 1.62, fill: { color: '161629' } })
s11.addText('The dirty soda and refresher tea market is a breakout category.', {
  x: L + 0.3, y: 5.65, w: W - L * 2 - 0.6, h: 0.42,
  fontSize: 14, bold: true, color: FZ_LIME, fontFace: 'Inter'
})
s11.addText('Dutch Bros crossed $1B in annual revenue with 900+ locations. Swig grew from 1 location to 60+ franchise locations in under 5 years. Starbucks Refreshers and dirty sodas are now among the fastest-growing drink orders in the US — with no social gifting layer built on top of any of them.', {
  x: L + 0.3, y: 6.1, w: W - L * 2 - 0.6, h: 0.9,
  fontSize: 13, color: 'AAAAAA', fontFace: 'Inter', valign: 'top'
})

// ════════════════════════════════════════════
// SLIDE 12 — REVIG (brand intro)
// ════════════════════════════════════════════
const s12 = pptx.addSlide()
s12.background = { color: FZ_BG }
s12.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.08, fill: { color: FZ_LIME } })

// Right panel — venue list
s12.addShape(pptx.ShapeType.rect, { x: 9.3, y: 0.08, w: 4.03, h: H - 0.08, fill: { color: '0A0A1A' } })
s12.addText('WORKS AT', {
  x: 9.55, y: 0.55, w: 3.5, h: 0.38,
  fontSize: 11, bold: true, color: FZ_LIME, fontFace: 'Inter', charSpacing: 4
})
const venues12 = [
  ['Dirty Soda Shops',  FZ_CORAL],
  ['Coffee Shops',      FZ_LIME ],
  ['Juice Bars',        FZ_CYAN ],
  ['Refresher & Tea',   FZ_LIME ],
  ['Smoothie Bars',     FZ_CORAL],
  ['Bakeries & Cafes',  FZ_CYAN ],
]
venues12.forEach(([n, c], i) => {
  s12.addText(n, {
    x: 9.55, y: 1.15 + i * 0.82, w: 3.5, h: 0.72,
    fontSize: 18, bold: true, color: c, fontFace: 'Inter', valign: 'middle'
  })
})
s12.addText('revig.shotonme.com', {
  x: 9.55, y: H - 0.42, w: 3.5, h: 0.3,
  fontSize: 12, color: '444466', fontFace: 'Inter', italic: true
})

// Left — wordmark + content
s12.addText('Revig', {
  x: L, y: 0.2, w: 8.4, h: 1.45,
  fontSize: 76, bold: true, color: FZ_LIME, fontFace: 'Inter'
})
s12.addText('Gift a cold brew. Send a dirty soda.\nTreat someone to something good.', {
  x: L, y: 1.65, w: 8.4, h: 0.95,
  fontSize: 22, color: WHITE, fontFace: 'Inter', lineSpacingMultiple: 1.2
})
s12.addShape(pptx.ShapeType.rect, { x: L, y: 2.72, w: 8.35, h: 0.03, fill: { color: FZ_LIME } })
s12.addText('Same idea as Shot On Me — zero alcohol. A separate brand built for coffee shops, soda spots, juice bars, and beyond.', {
  x: L, y: 2.9, w: 8.4, h: 0.6,
  fontSize: 15, color: '888899', fontFace: 'Inter'
})

// Occasions — single clean row with dots
s12.addText('SEND IT FOR', {
  x: L, y: 3.72, w: 8.4, h: 0.38,
  fontSize: 11, bold: true, color: FZ_LIME, fontFace: 'Inter', charSpacing: 4
})
const occ12 = [
  ['Coffee Date',    FZ_LIME ],
  ['Birthday',       FZ_CORAL],
  ['Just Because',   FZ_CYAN ],
  ['Congratulations',FZ_LIME ],
  ['Thank You',      FZ_CORAL],
  ['Good Morning',   FZ_CYAN ],
  ['You Got This',   FZ_LIME ],
]
occ12.forEach(([o, c], i) => {
  const row = Math.floor(i / 3), col = i % 3
  s12.addText(o, {
    x: L + col * 2.8, y: 4.22 + row * 0.72, w: 2.7, h: 0.62,
    fontSize: 17, bold: true, color: c, fontFace: 'Inter'
  })
})

// ════════════════════════════════════════════
// SLIDE 13 — TRANSITION
// ════════════════════════════════════════════
const s13 = pptx.addSlide()
s13.background = { color: '07060E' }
// Split top bar: lime left, gold right
s13.addShape(pptx.ShapeType.rect, { x: 0,     y: 0, w: W / 2, h: 0.08, fill: { color: FZ_LIME } })
s13.addShape(pptx.ShapeType.rect, { x: W / 2, y: 0, w: W / 2, h: 0.08, fill: { color: GOLD   } })

// Center vertical divider
s13.addShape(pptx.ShapeType.rect, { x: W / 2 - 0.015, y: 0.5, w: 0.03, h: 5.8, fill: { color: '1E1E30' } })

// Left — Revig
s13.addText('Revig', {
  x: L, y: 1.0, w: 5.9, h: 1.4,
  fontSize: 68, bold: true, color: FZ_LIME, fontFace: 'Inter'
})
s13.addText('The social gifting app\nfor the sober generation.', {
  x: L, y: 2.5, w: 5.9, h: 1.1,
  fontSize: 18, color: '888899', fontFace: 'Inter', lineSpacingMultiple: 1.3
})
s13.addText('revig.shotonme.com', {
  x: L, y: H - 0.65, w: 5.9, h: 0.35,
  fontSize: 13, color: '444460', fontFace: 'Inter', italic: true
})

// Right — Shot On Me
s13.addText('Shot On Me', {
  x: W / 2 + 0.5, y: 1.0, w: 6.0, h: 1.4,
  fontSize: 48, bold: true, color: GOLD, fontFace: 'Inter'
})
s13.addText('The social payment network\nfor bars & nightlife.', {
  x: W / 2 + 0.5, y: 2.5, w: 6.0, h: 1.1,
  fontSize: 18, color: DIM, fontFace: 'Inter', lineSpacingMultiple: 1.3
})
s13.addText('shotonme.com', {
  x: W / 2 + 0.5, y: H - 0.65, w: 6.0, h: 0.35,
  fontSize: 13, color: GOLD3, fontFace: 'Inter', italic: true
})

// Bottom unifying statement
s13.addShape(pptx.ShapeType.rect, { x: L, y: 4.35, w: W - L * 2, h: 0.03, fill: { color: '1E1E30' } })
s13.addText('Two brands. One platform. One founding team.', {
  x: L, y: 4.55, w: W - L * 2, h: 0.62,
  fontSize: 24, bold: true, color: WHITE, fontFace: 'Inter', align: 'center'
})
s13.addText('Shot On Me and Revig share one backend, one infrastructure, and one mission — to make every social moment feel like a gift.', {
  x: L + 1.0, y: 5.25, w: W - L * 2 - 2.0, h: 0.7,
  fontSize: 15, color: '666677', fontFace: 'Inter', align: 'center'
})

// ════════════════════════════════════════════
// SLIDE 14 — LEGAL
// ════════════════════════════════════════════
const s14 = pptx.addSlide()
base(s14)
tag(s14, 'Legal Discussion Points')

title(s14, 'Key items to address\nbefore we scale.', 0.65, 40)

rule(s14, 2.55)

const legal = [
  ['LLC Formation',              'Form before any revenue. Separates personal liability. Required before signing any venue or vendor contracts.'],
  ['Business Banking & Credit',  'Business bank account + credit card on day one. Mercury or Relay recommended. Never commingle personal funds.'],
  ['Money Transmitter License',  'Stripe holds the card-issuing license. The P2P wallet layer may require a state-level MTL under FinCEN. Requires fintech attorney review before scaling.'],
  ['Terms of Service & Privacy', 'Requires attorney review: wallet liability, age verification, CCPA/GDPR, dispute resolution, and venue data rights.'],
  ['Venue Agreements',           'Click-through contract needed: fee structure, data use, termination rights, and promotion liability.'],
  ['IP & Trademark',             'File "Shot On Me" and "Revig" trademarks immediately. Discuss multi-product IP structure under one LLC.'],
]
legal.forEach(([t, b], i) => {
  const y = 2.78 + i * 0.78
  s14.addText([
    { text: t + '   ', options: { bold: true, fontSize: 16, color: GOLD2, fontFace: 'Inter' } },
    { text: b,         options: { fontSize: 15, color: CREAM,  fontFace: 'Inter' } }
  ], { x: L, y, w: W - L * 2, h: 0.65 })
  if (i < legal.length - 1) s14.addShape(pptx.ShapeType.rect, { x: L, y: y + 0.72, w: W - L * 2, h: 0.015, fill: { color: '1A1408' } })
})

// ════════════════════════════════════════════
// SLIDE 15 — CLOSING
// ════════════════════════════════════════════
const s15 = pptx.addSlide()
base(s15)

s15.addText('Built.\nLive.\nReady to grow.', {
  x: L, y: 0.8, w: 9.0, h: 5.8,
  fontSize: 80, bold: true, color: WHITE,
  fontFace: 'Inter', lineSpacingMultiple: 0.95
})

s15.addShape(pptx.ShapeType.rect, { x: 9.8, y: 0.08, w: 3.53, h: H - 0.08, fill: { color: '100D02' } })
s15.addText('Shot On Me', { x: 9.95, y: 1.0, w: 3.2, h: 0.6, fontSize: 20, bold: true, color: GOLD, fontFace: 'Inter' })
s15.addText('shotonme.com', { x: 9.95, y: 1.65, w: 3.2, h: 0.35, fontSize: 13, color: GOLD3, fontFace: 'Inter' })
s15.addText('venues.shotonme.com', { x: 9.95, y: 2.05, w: 3.2, h: 0.35, fontSize: 13, color: GOLD3, fontFace: 'Inter' })
s15.addShape(pptx.ShapeType.rect, { x: 9.95, y: 2.55, w: 3.0, h: 0.025, fill: { color: FZ_LIME } })
s15.addText('Revig', { x: 9.95, y: 2.75, w: 3.2, h: 0.6, fontSize: 20, bold: true, color: FZ_LIME, fontFace: 'Inter' })
s15.addText('revig.shotonme.com', { x: 9.95, y: 3.4, w: 3.2, h: 0.35, fontSize: 13, color: FZ_LIME, fontFace: 'Inter' })
s15.addShape(pptx.ShapeType.rect, { x: 9.95, y: 4.0, w: 3.0, h: 0.025, fill: { color: GOLD3 } })
s15.addText('Kate Van Poppel\nFounder', { x: 9.95, y: 4.2, w: 3.2, h: 0.9, fontSize: 15, bold: true, color: WHITE, fontFace: 'Inter' })
s15.addText('shotonme@yahoo.com', { x: 9.95, y: 5.2, w: 3.2, h: 0.35, fontSize: 12, color: GOLD3, fontFace: 'Inter' })

// ── Save ─────────────────────────────────────
pptx.writeFile({ fileName: 'C:/Users/kvanpoppel/Desktop/ShotOnMe_Presentation.pptx' })
  .then(() => console.log('Done. 15 slides. Black and gold.'))
  .catch(err => console.error(err))
