const officegen = require('./docgen/node_modules/officegen')
const fs = require('fs')
const path = require('path')

const outputDir = 'C:/Users/kvanpoppel/Desktop'

// ─────────────────────────────────────────────
// WORD DOCUMENT
// ─────────────────────────────────────────────
const docx = officegen('docx')

docx.on('error', (err) => console.error('Word error:', err))

const heading1 = (text) => {
  const p = docx.createP()
  p.addText(text, { bold: true, font_size: 22, color: '1a1a2e' })
  return p
}

const heading2 = (text) => {
  const p = docx.createP()
  p.addText(text, { bold: true, font_size: 16, color: '16213e' })
  return p
}

const heading3 = (text) => {
  const p = docx.createP()
  p.addText(text, { bold: true, font_size: 13, color: '0f3460' })
  return p
}

const para = (text) => {
  const p = docx.createP()
  p.addText(text, { font_size: 11 })
  return p
}

const bullet = (text, bold_prefix) => {
  const p = docx.createListOfDots()
  if (bold_prefix) {
    p.addText(bold_prefix, { bold: true, font_size: 11 })
    p.addText(text, { font_size: 11 })
  } else {
    p.addText(text, { font_size: 11 })
  }
  return p
}

const spacer = () => docx.createP()

// Title
const title = docx.createP()
title.addText('Shot On Me', { bold: true, font_size: 32, color: 'e94560' })
spacer()
const subtitle = docx.createP()
subtitle.addText('Business Plan — Attorney Presentation', { font_size: 16, color: '555555', italic: true })
spacer()
spacer()

// Section 1
heading1('What It Is')
spacer()
para('Shot On Me is the first closed-loop social payment network built exclusively for bars, restaurants, and nightlife venues.')
spacer()
para('It connects three things no platform has ever unified: a social feed, a real-money wallet, and instant tap-to-pay at any venue — all in one app.')
spacer()

// Section 2
heading1('The Problem')
spacer()
heading3('Problem 1 — Buying someone a drink is broken')
para('If you want to buy a friend a drink today, you either have to be physically at the bar with them, or send them money on Venmo and hope they actually use it on a drink. There is no way to send someone a drink remotely, in real time, with a specific intention attached to it.')
spacer()
heading3('Problem 2 — Venmo and PayPal fail at the point of sale')
para('When someone sends you money on Venmo or PayPal, you cannot use it instantly and for free at a bar or restaurant. To spend it, you either:')
bullet('Transfer it to your bank first (1–3 business days), or')
bullet('Use a physical card — not a virtual tap-to-pay')
bullet('Pay an instant transfer fee just to access your own money')
spacer()
para('Shot On Me eliminates all of that. The moment money lands in your wallet — from a friend, a promotion, or a reward — you can tap your phone and spend it anywhere with an NFC terminal. No wait. No fee. No transfer. Instant.')
spacer()

// Section 3
heading1('How It Works — The Full Loop')
spacer()
heading2('For Users')
spacer()
bullet('Download Shot On Me, sign up, and receive an ', 'Step 1: ')
const p1b = docx.createListOfDots()
p1b.addText('Step 1: ', { bold: true, font_size: 11 })
p1b.addText('Download Shot On Me, sign up, and receive an instant virtual wallet card — no waiting, no approval, no physical card needed. It lives in Apple Pay and Google Pay the moment you create your account.')
const p2b = docx.createListOfDots()
p2b.addText('Step 2: ', { bold: true, font_size: 11 })
p2b.addText('Load your wallet or receive money from friends, venues, or rewards.')
const p3b = docx.createListOfDots()
p3b.addText('Step 3: ', { bold: true, font_size: 11 })
p3b.addText('Find a friend in the app — nearby, in your feed, or by username — and send them a dollar amount, a reason ("Happy Birthday"), or a specific drink.')
const p4b = docx.createListOfDots()
p4b.addText('Step 4: ', { bold: true, font_size: 11 })
p4b.addText('The recipient gets an instant notification by text or in-app: "Kate just bought you a tequila shot at O\'Malley\'s — tap to redeem."')
const p5b = docx.createListOfDots()
p5b.addText('Step 5: ', { bold: true, font_size: 11 })
p5b.addText('They open the app (or tap the text notification directly) and hit Tap & Pay. Their phone becomes a virtual card. They tap at the bar\'s existing terminal. Done.')
const p6b = docx.createListOfDots()
p6b.addText('Step 6: ', { bold: true, font_size: 11 })
p6b.addText('The social moment is captured — it posts to the feed, earns points, and builds their profile history.')
spacer()

heading2('For Venues')
spacer()
const v1 = docx.createListOfDots()
v1.addText('Sign up free on the Venue Portal (venues.shotonme.com)')
const v2 = docx.createListOfDots()
v2.addText('Set your menu, promotions, deals, happy hours, and amenities')
const v3 = docx.createListOfDots()
v3.addText('See real-time check-ins, followers, and activity from Shot On Me users at your venue')
const v4 = docx.createListOfDots()
v4.addText('Push instant notifications to your followers: "Half-price shots until 9PM tonight"')
const v5 = docx.createListOfDots()
v5.addText('Run promotions that surface directly in the app\'s feed and discovery tab')
const v6 = docx.createListOfDots()
v6.addText('Access AI-powered insights — peak hours, top spenders, trending nights')
const v7 = docx.createListOfDots()
v7.addText('Build a subscriber base and loyalty program — your venue gets its own following, like a social media page, tied to real purchase behavior')
const v8 = docx.createListOfDots()
v8.addText('Get paid via Stripe — no new hardware, no new POS system required')
const v9 = docx.createListOfDots()
v9.addText('Shot On Me actively promotes participating venues at bar and restaurant industry conventions and hospitality trade shows — a free marketing channel venues don\'t manage themselves')
spacer()

// Section 4
heading1('What\'s Built — The Full Platform')
spacer()

heading2('Payments & Wallet')
const pw1 = docx.createListOfDots()
pw1.addText('Real-money wallet powered by Stripe')
const pw2 = docx.createListOfDots()
pw2.addText('Instant virtual Visa/Mastercard issued the moment a user signs up (Stripe Issuing) — lives in Apple Pay and Google Pay immediately')
const pw3 = docx.createListOfDots()
pw3.addText('Tap & Pay at any NFC terminal — works with existing bar/restaurant hardware, no new equipment needed')
const pw4 = docx.createListOfDots()
pw4.addText('P2P drink and money sending with custom messages and drink intent')
const pw5 = docx.createListOfDots()
pw5.addText('Rewards system — users earn points for check-ins, sending drinks, referring friends, and venue visits; points convert to wallet credits and redeemable rewards')
const pw6 = docx.createListOfDots()
pw6.addText('Reward code redemption — venues issue promo codes directly redeemable in the wallet')
const pw7 = docx.createListOfDots()
pw7.addText('Stripe payouts to venues')
spacer()

heading2('Social Layer')
const sl1 = docx.createListOfDots()
sl1.addText('User profiles with followers, bio, and full activity history')
const sl2 = docx.createListOfDots()
sl2.addText('Feed with posts, stories, reactions, comments, and photo sharing')
const sl3 = docx.createListOfDots()
sl3.addText('Check-ins at venues — shared publicly in the feed with venue tags')
const sl4 = docx.createListOfDots()
sl4.addText('Group chats and direct messaging')
const sl5 = docx.createListOfDots()
sl5.addText('Instant push notifications and SMS for every social action')
const sl6 = docx.createListOfDots()
sl6.addText('Leaderboards, badges, and gamification')
const sl7 = docx.createListOfDots()
sl7.addText('Referral system — users earn wallet credits for inviting friends')
const sl8 = docx.createListOfDots()
sl8.addText('Round Mode — buy a round for the whole table at once')
const sl9 = docx.createListOfDots()
sl9.addText('Squads — group social layer for friend groups')
spacer()

heading2('Venue Discovery & AI')
const ai1 = docx.createListOfDots()
ai1.addText('Map view with real-time venue data')
const ai2 = docx.createListOfDots()
ai2.addText('Filter by: promotions, happy hour, nearby, trending')
const ai3 = docx.createListOfDots()
ai3.addText('Filter by amenities: dogs allowed, kids friendly, food, BYOB, live music, trivia, outdoor seating, pool tables, dance floor, sports TV, karaoke, arcade')
const ai4 = docx.createListOfDots()
ai4.addText('"For You" AI recommendations — learns your preferences and surfaces the venues most likely to match your vibe on any given night')
const ai5 = docx.createListOfDots()
ai5.addText('Users set a "My Vibe" preference profile — the AI matches them to venues in real time')
const ai6 = docx.createListOfDots()
ai6.addText('Venue owners set their amenity flags — the AI does the matching automatically')
const ai7 = docx.createListOfDots()
ai7.addText('AI-powered feed ranking and post personalization')
spacer()

heading2('Venue Portal')
const vp1 = docx.createListOfDots()
vp1.addText('Real-time dashboard: check-ins, followers, wallet activity')
const vp2 = docx.createListOfDots()
vp2.addText('Promotion and deal management — push deals directly into user feeds')
const vp3 = docx.createListOfDots()
vp3.addText('Instant follower notifications — push a message to everyone who follows your venue')
const vp4 = docx.createListOfDots()
vp4.addText('Amenities and profile management')
const vp5 = docx.createListOfDots()
vp5.addText('Loyalty and rewards program configuration')
const vp6 = docx.createListOfDots()
vp6.addText('Revenue analytics and AI-powered predictive insights')
const vp7 = docx.createListOfDots()
vp7.addText('Venue referral program')
const vp8 = docx.createListOfDots()
vp8.addText('Stripe payout management')
spacer()

// Section 5
heading1('Why Shot On Me is One of a Kind')
spacer()
para('No single platform does all of this. Here is where every competitor falls short:')
spacer()

heading3('Venmo / Cash App / PayPal')
para('Send money — yes. But you cannot use it instantly at a bar without a fee or a wait. No social context. No drink intent. No venue layer. No tap-to-pay on arrival. Money sits idle until manually transferred.')
spacer()

heading3('Instagram / TikTok')
para('Great social feed. Zero payments. Zero venue integration. You can post about a bar — you cannot buy someone a drink through it.')
spacer()

heading3('OpenTable / Yelp')
para('Venue discovery — yes. But purely informational. No social layer, no payments, no wallet, no real-time notifications to followers, no tap-to-pay.')
spacer()

heading3('Apple Pay / Google Pay')
para('Tap-to-pay — yes. But it is your own money. There is no concept of someone else sending you drink money that you can spend instantly. No social layer. No venue relationships.')
spacer()

heading3('Shot On Me is the only platform that:')
const u1 = docx.createListOfDots()
u1.addText('Lets you send someone a drink — real money, real intent — from anywhere in the world')
const u2 = docx.createListOfDots()
u2.addText('Lets the recipient spend it instantly with a tap — no transfer fee, no wait')
const u3 = docx.createListOfDots()
u3.addText('Wraps the entire transaction in a social moment (feed post, notification, reaction)')
const u4 = docx.createListOfDots()
u4.addText('Gives the venue real-time visibility, followers, and a direct marketing channel')
const u5 = docx.createListOfDots()
u5.addText('Uses AI to connect users to the right venue at the right time')
spacer()
const moat = docx.createP()
moat.addText('The moat: no one has closed the loop between the social moment, the payment, and the venue. Shot On Me owns that loop.', { bold: true, font_size: 12, color: 'e94560' })
spacer()

// Section 6
heading1('Business Model')
spacer()
const unotice = docx.createP()
unotice.addText('Users pay nothing to use the platform. No transaction fees, no transfer fees, no subscription.', { bold: true, font_size: 12 })
spacer()
para('Revenue comes from:')
const b1 = docx.createListOfDots()
b1.addText('Venue subscriptions — ', { bold: true })
b1.addText('tiered monthly plans (Free / Basic / Premium / Enterprise) for the Venue Portal, analytics, promotions, and follower notifications')
const b2 = docx.createListOfDots()
b2.addText('Platform transaction fee — ', { bold: true })
b2.addText('a small percentage on each drink transaction, paid by the venue — never the user')
const b3 = docx.createListOfDots()
b3.addText('Promoted placement — ', { bold: true })
b3.addText('venues pay to feature deals and promotions at the top of the discovery feed')
const b4 = docx.createListOfDots()
b4.addText('Revenue share — ', { bold: true })
b4.addText('on venue-run promotions and loyalty rewards redeemed through the platform')
const b5 = docx.createListOfDots()
b5.addText('Convention and trade show presence — ', { bold: true })
b5.addText('direct venue acquisition channel driving subscription revenue')
spacer()

// Section 7
heading1('Venue Acquisition Strategy')
spacer()
para('There is no hardware barrier. Shot On Me works on every existing NFC terminal in every bar and restaurant in America — today. Venues sign up, set up their profile, and their customers start using it immediately.')
spacer()
para('Go-to-market: attend bar, restaurant, and hospitality industry conventions and trade shows. Sign venues up on the spot. Give them free tier access. Let them see their followers grow. Convert to paid when the value is clear.')
spacer()

// Section 8
heading1('Discussion Points for Your Attorney')
spacer()

heading2('1. Entity Formation — LLC')
para('Form a single-member LLC immediately before any revenue is generated. Recommended: Delaware (investor-friendly, strong corporate law) or home state for simplicity. This separates personal liability from the business and is required before signing any vendor or venue contracts.')
spacer()

heading2('2. Business Banking & Credit')
para('Open a business bank account the day the LLC is formed (Mercury or Relay recommended — no minimums, great for tech startups). Apply for a business credit card immediately to establish business credit history separate from personal. Never commingle personal and business funds.')
spacer()

heading2('3. Money Transmitter License (MTL)')
para('This is the most critical legal question. Shot On Me moves real money between users and venues. Depending on how Stripe Issuing and the wallet are structured, the platform may qualify as a money services business (MSB) under FinCEN regulations. Stripe holds the actual issuing license — the key question is whether the wallet and P2P transfer layer requires a separate state-level MTL. A fintech attorney must review the Stripe agreement and exact payment flow before scaling.')
spacer()

heading2('4. Terms of Service & Privacy Policy')
para('Both are built into the platform and need attorney review covering:')
const tos1 = docx.createListOfDots()
tos1.addText('User wallet and payment liability disclaimers')
const tos2 = docx.createListOfDots()
tos2.addText('Dispute resolution terms')
const tos3 = docx.createListOfDots()
tos3.addText('Data collection and sale disclosures (CCPA / GDPR)')
const tos4 = docx.createListOfDots()
tos4.addText('Age verification (alcohol-adjacent product)')
const tos5 = docx.createListOfDots()
tos5.addText('Venue agreement terms — obligations on both sides')
spacer()

heading2('5. Venue Agreements')
para('Venues need a click-through agreement covering:')
const va1 = docx.createListOfDots()
va1.addText('What data Shot On Me collects about their customers')
const va2 = docx.createListOfDots()
va2.addText('Revenue share and fee structure')
const va3 = docx.createListOfDots()
va3.addText('Termination and data deletion rights')
const va4 = docx.createListOfDots()
va4.addText('Liability if a promotion causes harm')
spacer()

heading2('6. IP & Trademark')
para('File a trademark on "Shot On Me" and the logo immediately. The brand name is the core asset.')
spacer()

heading2('7. Revig — Companion Platform')
para('Shot On Me also includes a companion app called Revig — a standalone social platform (think Instagram for friend groups) built on the same backend infrastructure and user base. Revig is a separate product with its own URL and deployment, expanding the platform\'s total addressable market beyond nightlife into everyday social connection. The same LLC can own both products, but Revig may warrant its own trademark and terms of service. Discuss IP ownership structure for multi-product entities.')
spacer()

// Save Word doc
const wordPath = path.join(outputDir, 'ShotOnMe_BusinessPlan.docx')
const wordOut = fs.createWriteStream(wordPath)
wordOut.on('error', (err) => console.error('Write error:', err))
wordOut.on('close', () => console.log('Word doc saved:', wordPath))
docx.generate(wordOut)

// ─────────────────────────────────────────────
// POWERPOINT
// ─────────────────────────────────────────────
setTimeout(() => {
  const pptx = officegen('pptx')
  pptx.on('error', (err) => console.error('PPT error:', err))

  const BG = '0a0a0f'
  const ACCENT = 'e94560'
  const WHITE = 'ffffff'
  const LIGHT = 'cccccc'
  const DARK_ACCENT = '16213e'

  const addSlide = (titleText, subtitleText) => {
    const slide = pptx.makeNewSlide()
    slide.back = BG
    slide.addText(titleText, {
      x: 0.5, y: 0.3, cx: 9, cy: 1.2,
      font_size: 36, bold: true, color: ACCENT
    })
    if (subtitleText) {
      slide.addText(subtitleText, {
        x: 0.5, y: 1.4, cx: 9, cy: 0.5,
        font_size: 16, color: LIGHT, italic: true
      })
    }
    return slide
  }

  const addBullets = (slide, items, startY, options = {}) => {
    items.forEach((item, i) => {
      const y = startY + (i * (options.lineHeight || 0.55))
      if (typeof item === 'object' && item.bold) {
        slide.addText('• ' + item.bold, {
          x: 0.6, y, cx: 8.8, cy: 0.5,
          font_size: options.font_size || 14, bold: true, color: ACCENT
        })
        if (item.text) {
          slide.addText('  ' + item.text, {
            x: 0.9, y: y + 0.28, cx: 8.5, cy: 0.4,
            font_size: (options.font_size || 14) - 2, color: LIGHT
          })
        }
      } else {
        slide.addText('• ' + item, {
          x: 0.6, y, cx: 8.8, cy: 0.5,
          font_size: options.font_size || 14, color: LIGHT
        })
      }
    })
  }

  // SLIDE 1 — Title
  const s1 = pptx.makeNewSlide()
  s1.back = BG
  s1.addText('Shot On Me', {
    x: 0.5, y: 1.5, cx: 9, cy: 1.5,
    font_size: 56, bold: true, color: ACCENT
  })
  s1.addText('The Social Payment Network for Bars & Nightlife', {
    x: 0.5, y: 3.0, cx: 9, cy: 0.7,
    font_size: 22, color: WHITE
  })
  s1.addText('Confidential — Business Plan Presentation', {
    x: 0.5, y: 4.2, cx: 9, cy: 0.5,
    font_size: 14, color: LIGHT, italic: true
  })

  // SLIDE 2 — What It Is
  const s2 = addSlide('What Is Shot On Me?')
  s2.addText('The first closed-loop social payment network built exclusively for bars, restaurants, and nightlife venues.', {
    x: 0.5, y: 1.5, cx: 9, cy: 0.8,
    font_size: 18, color: WHITE, bold: true
  })
  s2.addText('It connects three things no platform has ever unified:', {
    x: 0.5, y: 2.4, cx: 9, cy: 0.5,
    font_size: 15, color: LIGHT
  })
  addBullets(s2, [
    'A real-money wallet — funded and spendable instantly',
    'A social feed — built around nightlife moments',
    'Tap-to-pay at any venue — no hardware, no fees, no wait'
  ], 2.95, { font_size: 16 })

  // SLIDE 3 — The Problem
  const s3 = addSlide('The Problem We Solve')
  s3.addText('Problem 1: Buying someone a drink is broken', {
    x: 0.5, y: 1.5, cx: 9, cy: 0.5,
    font_size: 17, bold: true, color: ACCENT
  })
  s3.addText('You have to be physically present — or send Venmo money with no guarantee it goes toward a drink.', {
    x: 0.5, y: 2.0, cx: 9, cy: 0.6,
    font_size: 14, color: LIGHT
  })
  s3.addText('Problem 2: Venmo/PayPal fail at the bar', {
    x: 0.5, y: 2.8, cx: 9, cy: 0.5,
    font_size: 17, bold: true, color: ACCENT
  })
  addBullets(s3, [
    'Transfer to bank: 1–3 business days',
    'Use a physical card: not instant, not virtual',
    'Instant transfer: costs the recipient a fee just to access their money'
  ], 3.35, { font_size: 14 })
  s3.addText('Shot On Me: money lands → tap phone → spent. Instantly. Free. Every time.', {
    x: 0.5, y: 5.0, cx: 9, cy: 0.6,
    font_size: 16, bold: true, color: WHITE
  })

  // SLIDE 4 — How It Works (Users)
  const s4 = addSlide('How It Works — For Users')
  const steps = [
    'Sign up → instant virtual wallet card in Apple Pay / Google Pay',
    'Load wallet or receive money from friends, venues, or rewards',
    'Send a dollar amount, a reason, or a specific drink to any friend',
    'Recipient gets instant text or in-app notification to redeem',
    'They tap their phone at the bar\'s existing terminal — done',
    'Moment posts to the social feed, earns points, builds their profile'
  ]
  steps.forEach((step, i) => {
    s4.addText(`${i + 1}.  ${step}`, {
      x: 0.6, y: 1.6 + (i * 0.58), cx: 8.8, cy: 0.5,
      font_size: 14, color: i === 4 ? WHITE : LIGHT,
      bold: i === 4
    })
  })

  // SLIDE 5 — How It Works (Venues)
  const s5 = addSlide('How It Works — For Venues')
  addBullets(s5, [
    'Sign up free at venues.shotonme.com',
    'Set promotions, deals, happy hours, and amenities',
    'See real-time check-ins, followers, and wallet activity',
    'Push instant notifications to all venue followers',
    'Access AI insights — peak hours, top spenders, trends',
    'Build a loyal subscriber base like a social media page',
    'Get paid via Stripe — no new hardware required',
    'We promote your venue at bar & restaurant industry conventions'
  ], 1.6, { font_size: 14, lineHeight: 0.52 })

  // SLIDE 6 — Platform Features
  const s6 = addSlide('The Full Platform')
  const cols = [
    { x: 0.5, title: 'Payments & Wallet', items: ['Instant virtual card on signup', 'Tap & Pay — any NFC terminal', 'P2P drink sending', 'Points, rewards & redemption', 'Stripe payouts to venues'] },
    { x: 5.0, title: 'Social & Discovery', items: ['Feed, stories, check-ins', 'Followers & notifications', 'AI venue recommendations', 'Amenity filters + My Vibe', 'Groups, squads, messaging'] }
  ]
  cols.forEach(col => {
    s6.addText(col.title, {
      x: col.x, y: 1.5, cx: 4.2, cy: 0.4,
      font_size: 15, bold: true, color: ACCENT
    })
    col.items.forEach((item, i) => {
      s6.addText('• ' + item, {
        x: col.x, y: 2.0 + (i * 0.52), cx: 4.2, cy: 0.45,
        font_size: 13, color: LIGHT
      })
    })
  })
  s6.addText('Venue Portal: dashboard, promotions, analytics, AI insights, loyalty, payouts', {
    x: 0.5, y: 5.0, cx: 9, cy: 0.5,
    font_size: 13, color: WHITE, italic: true
  })

  // SLIDE 7 — Why Unique
  const s7 = addSlide('Why Shot On Me Is One of a Kind')
  const competitors = [
    { name: 'Venmo / PayPal', gap: 'Cannot spend instantly at bar. Fees to access money. No social. No venue layer.' },
    { name: 'Instagram / TikTok', gap: 'No payments. No venue integration. Cannot buy a drink through them.' },
    { name: 'OpenTable / Yelp', gap: 'Discovery only. No payments, no wallet, no followers, no notifications.' },
    { name: 'Apple / Google Pay', gap: 'Tap-to-pay only. Your money only. No social. No someone buying you a drink.' },
  ]
  competitors.forEach((c, i) => {
    s7.addText(c.name, {
      x: 0.5, y: 1.55 + (i * 0.88), cx: 2.8, cy: 0.38,
      font_size: 13, bold: true, color: ACCENT
    })
    s7.addText(c.gap, {
      x: 3.4, y: 1.55 + (i * 0.88), cx: 6.1, cy: 0.38,
      font_size: 12, color: LIGHT
    })
  })
  s7.addText('Shot On Me owns the only closed loop: social moment → payment → venue → tap-to-pay.', {
    x: 0.5, y: 5.1, cx: 9, cy: 0.5,
    font_size: 15, bold: true, color: WHITE
  })

  // SLIDE 8 — Business Model
  const s8 = addSlide('Business Model')
  s8.addText('Users pay nothing. Revenue comes from venues and the platform.', {
    x: 0.5, y: 1.5, cx: 9, cy: 0.5,
    font_size: 17, bold: true, color: WHITE
  })
  addBullets(s8, [
    { bold: 'Venue Subscriptions', text: 'Free / Basic / Premium / Enterprise tiers — portal, analytics, promotions, notifications' },
    { bold: 'Platform Transaction Fee', text: 'Small % per drink transaction — paid by the venue, never the user' },
    { bold: 'Promoted Placement', text: 'Venues pay to feature deals at the top of the discovery feed' },
    { bold: 'Revenue Share', text: 'On venue-run promotions and loyalty rewards redeemed in-platform' },
    { bold: 'Convention Presence', text: 'Trade show acquisition drives paid venue subscriptions' }
  ], 2.15, { font_size: 14, lineHeight: 0.72 })

  // SLIDE 9 — Attorney Topics
  const s9 = addSlide('Legal Discussion Points')
  addBullets(s9, [
    { bold: 'LLC Formation', text: 'Form before any revenue — Delaware or home state' },
    { bold: 'Business Banking & Credit', text: 'Business account + credit card on day 1 (Mercury / Relay)' },
    { bold: 'Money Transmitter License', text: 'Fintech review needed — Stripe holds issuing license; P2P layer may require state MTL' },
    { bold: 'Terms of Service & Privacy Policy', text: 'Review for wallet liability, age verification, CCPA/GDPR, venue data rights' },
    { bold: 'Venue Agreements', text: 'Click-through contract: data use, fees, termination, liability' },
    { bold: 'IP & Trademark', text: 'File "Shot On Me" trademark immediately — name is the asset' },
    { bold: 'Revig', text: 'Companion social app on same backend — discuss multi-product IP structure and separate trademark' }
  ], 1.55, { font_size: 13, lineHeight: 0.63 })

  // SLIDE 10 — Closing
  const s10 = pptx.makeNewSlide()
  s10.back = BG
  s10.addText('Shot On Me', {
    x: 0.5, y: 1.8, cx: 9, cy: 1.2,
    font_size: 48, bold: true, color: ACCENT
  })
  s10.addText('The social moment. The payment. The venue.\nAll in one tap.', {
    x: 0.5, y: 3.1, cx: 9, cy: 1.0,
    font_size: 22, color: WHITE
  })
  s10.addText('shotonme.com  |  venues.shotonme.com', {
    x: 0.5, y: 4.5, cx: 9, cy: 0.5,
    font_size: 14, color: LIGHT, italic: true
  })

  // Save PPT
  const pptPath = path.join(outputDir, 'ShotOnMe_Presentation.pptx')
  const pptOut = fs.createWriteStream(pptPath)
  pptOut.on('error', (err) => console.error('PPT write error:', err))
  pptOut.on('close', () => console.log('PowerPoint saved:', pptPath))
  pptx.generate(pptOut)

}, 2000)
