'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How does the AI analytics work?',
    answer: 'Our AI analyzes your venue\'s historical data, customer behavior patterns, and market trends to provide actionable insights. It learns from your performance data to suggest optimal promotion timing, discount percentages, and target demographics that are most likely to convert.',
  },
  {
    question: 'How do I integrate with the Shot on Me app?',
    answer: 'When you create promotions in the portal, they automatically appear in the Shot on Me app for all users in your area. Users receive push notifications about new deals, and your promotions are featured prominently in the app\'s discovery feed. All data syncs in real-time.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'We support all major payment methods through Stripe, including credit cards, debit cards, and digital wallets. All transactions are processed securely with PCI-compliant encryption and escrow protection.',
  },
  {
    question: 'How do I track my revenue and performance?',
    answer: 'The dashboard provides real-time insights into your venue\'s performance, including revenue, check-ins, promotion redemptions, and customer engagement metrics. You can view historical data, compare time periods, and access AI-powered revenue forecasts.',
  },
  {
    question: 'Can I schedule promotions in advance?',
    answer: 'Yes! You can create and schedule promotions in advance using our promotion templates. Set start and end dates, and the system will automatically publish them at the scheduled time.',
  },
  {
    question: 'How secure is my data?',
    answer: 'We use industry-standard encryption, secure authentication, and PCI-compliant payment processing. All data is stored securely and backed up regularly. We never share your data with third parties without your explicit consent.',
  },
  {
    question: 'What kind of customer insights do I get?',
    answer: 'You receive detailed customer profiles including visit frequency, spending patterns, preferred promotion types, and engagement history. This helps you send targeted promotions to specific customer segments.',
  },
  {
    question: 'Is there a mobile app for venue owners?',
    answer: 'Currently, the venue portal is accessible via web browser on any device. We\'re working on a dedicated mobile app for venue owners, which will be available soon.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h2 className="text-2xl font-bold text-primary-500 mb-6 text-center">Frequently Asked Questions</h2>
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="bg-black/40 border border-primary-500/20 rounded-lg overflow-hidden transition-all duration-300"
        >
          <button
            onClick={() => toggleFAQ(index)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-black/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            aria-expanded={openIndex === index}
            aria-controls={`faq-answer-${index}`}
          >
            <span className="text-sm font-semibold text-primary-500 pr-4">{faq.question}</span>
            <ChevronDown
              className={`w-5 h-5 text-primary-500 flex-shrink-0 transition-transform duration-300 ${
                openIndex === index ? 'transform rotate-180' : ''
              }`}
            />
          </button>
          <div
            id={`faq-answer-${index}`}
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-5 pb-4">
              <p className="text-sm text-primary-400/90 leading-relaxed">{faq.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

