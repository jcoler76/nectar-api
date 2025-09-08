# SILO C: Marketing Site & Shared Infrastructure Guide

## 🎯 **Overview**
Build a professional marketing website and manage the shared infrastructure that supports all three applications (marketing site, customer app, and admin portal). This includes the public-facing website, shared services, and deployment infrastructure.

**Domains:** 
- `nectar.com` (Marketing Site)
- Shared infrastructure for `app.nectar.com` and `admin.nectarstudio.ai`

**Repository:** `nectar-marketing` (new) + Infrastructure management  
**Technology:** Next.js 14 + Shared PostgreSQL + Infrastructure as Code  

---

## 📂 **Project Structure**

```
nectar-marketing/
├── 📁 app/                     # Next.js 14 App Router
│   ├── 📁 (marketing)/        # Marketing pages
│   ├── 📁 blog/               # Blog pages
│   ├── 📁 docs/               # Documentation
│   ├── 📁 api/                # API routes
│   ├── layout.tsx
│   └── page.tsx
├── 📁 components/              # Reusable UI components
│   ├── 📁 ui/                 # Base UI components
│   ├── 📁 marketing/          # Marketing-specific components
│   └── 📁 forms/              # Contact and lead forms
├── 📁 content/                 # Markdown content
│   ├── 📁 blog/               # Blog posts
│   ├── 📁 docs/               # Documentation
│   └── 📁 case-studies/       # Customer stories
├── 📁 lib/                     # Utility functions
├── 📁 styles/                  # Global styles
├── 📁 public/                  # Static assets
├── 📁 infrastructure/          # Infrastructure as Code
│   ├── 📁 terraform/          # Terraform configs
│   ├── 📁 docker/             # Docker compositions
│   └── 📁 scripts/            # Deployment scripts
└── 📁 shared-services/         # Shared API services
    ├── 📁 auth/               # Shared authentication
    ├── 📁 notifications/      # Email/SMS services
    └── 📁 analytics/          # Shared analytics
```

---

## 🌐 **Phase 1: Marketing Site Development**

### **C1.1: Next.js Project Setup**

```bash
# Create Next.js project with TypeScript
npx create-next-app@latest nectar-marketing --typescript --tailwind --eslint --app
cd nectar-marketing

# Install marketing-specific dependencies
npm install @next/mdx @mdx-js/loader @mdx-js/react
npm install framer-motion lucide-react
npm install @headlessui/react @tailwindcss/typography
npm install next-seo next-sitemap
npm install contentlayer next-contentlayer date-fns

# Install form handling and validation
npm install react-hook-form @hookform/resolvers zod
npm install nodemailer @sendgrid/mail

# Install analytics and monitoring
npm install @vercel/analytics @vercel/speed-insights
npm install posthog-js

# Development dependencies
npm install -D @types/nodemailer prettier-plugin-tailwindcss
```

**Next.js Configuration (`next.config.js`)**:
```javascript
const { withContentlayer } = require('next-contentlayer')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    mdxRs: true,
  },
  images: {
    domains: ['images.unsplash.com', 'cdn.nectar.com'],
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: 'https://app.nectar.com/login',
        permanent: true,
      },
      {
        source: '/signup',
        destination: 'https://app.nectar.com/signup',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: 'https://app.nectar.com/dashboard',
        permanent: true,
      },
    ]
  },
}

module.exports = withContentlayer(nextConfig)
```

**Tailwind Configuration (`tailwind.config.js`)**:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
```

### **C1.2: Landing Page Components**

**Hero Section (`components/marketing/Hero.tsx`)**:
```typescript
'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRightIcon, PlayCircleIcon } from '@heroicons/react/24/outline'

export const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative pt-20 pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Connect Your Data,{' '}
                <span className="text-brand-600">Automate Everything</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Build powerful workflows that connect your databases, APIs, and services. 
                No code required. Enterprise-grade security. Scales with your business.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="https://app.nectar.com/signup"
                  className="rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
                >
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 h-4 w-4 inline" />
                </Link>
                <Link
                  href="#demo"
                  className="text-sm font-semibold leading-6 text-gray-900 hover:text-brand-600 transition-colors"
                >
                  Watch Demo <PlayCircleIcon className="ml-1 h-4 w-4 inline" />
                </Link>
              </div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-16"
            >
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Trusted by innovative companies
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-8 opacity-60">
                {/* Company logos would go here */}
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
              </div>
            </motion.div>
          </div>

          {/* Product screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-16 flow-root sm:mt-24"
          >
            <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
              <img
                src="/dashboard-screenshot.png"
                alt="Nectar Dashboard"
                width={2432}
                height={1442}
                className="rounded-md shadow-2xl ring-1 ring-gray-900/10"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
```

**Features Section (`components/marketing/Features.tsx`)**:
```typescript
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  DatabaseIcon,
  CogIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CloudIcon,
  LightningBoltIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Database Connections',
    description: 'Connect to PostgreSQL, MySQL, MongoDB, and more with enterprise-grade security.',
    icon: DatabaseIcon,
    color: 'text-blue-600',
  },
  {
    name: 'Visual Workflow Builder',
    description: 'Drag-and-drop interface to build complex automation workflows without coding.',
    icon: CogIcon,
    color: 'text-green-600',
  },
  {
    name: 'Enterprise Security',
    description: 'SOC 2 compliant with encryption at rest and in transit, plus audit logging.',
    icon: ShieldCheckIcon,
    color: 'text-purple-600',
  },
  {
    name: 'Real-time Analytics',
    description: 'Monitor workflow performance and data flow with comprehensive dashboards.',
    icon: ChartBarIcon,
    color: 'text-orange-600',
  },
  {
    name: 'Cloud-Native',
    description: 'Built for the cloud with automatic scaling and 99.9% uptime SLA.',
    icon: CloudIcon,
    color: 'text-indigo-600',
  },
  {
    name: 'Lightning Fast',
    description: 'Optimized for performance with sub-second response times and efficient execution.',
    icon: LightningBoltIcon,
    color: 'text-yellow-600',
  },
]

export const Features = () => {
  return (
    <div id="features" className="py-24 bg-white sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-600">
            Powerful Features
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to automate your business
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            From simple data synchronization to complex multi-step workflows, 
            Nectar provides all the tools you need to connect and automate your systems.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col"
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className={`h-5 w-5 flex-none ${feature.color}`} />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
```

**Pricing Section (`components/marketing/Pricing.tsx`)**:
```typescript
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/outline'

const plans = [
  {
    name: 'Starter',
    id: 'starter',
    price: { monthly: 29, annually: 290 },
    description: 'Perfect for small teams getting started with automation.',
    features: [
      'Up to 5 database connections',
      '100 workflow executions/month',
      'Basic workflow templates',
      'Email support',
      'Standard security',
    ],
    cta: 'Start free trial',
    mostPopular: false,
  },
  {
    name: 'Professional',
    id: 'professional',
    price: { monthly: 99, annually: 990 },
    description: 'For growing businesses that need more power and flexibility.',
    features: [
      'Up to 25 database connections',
      '1,000 workflow executions/month',
      'Advanced workflow templates',
      'Priority support',
      'Advanced security & compliance',
      'Team collaboration',
      'API access',
    ],
    cta: 'Start free trial',
    mostPopular: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: { monthly: 299, annually: 2990 },
    description: 'For large organizations with complex automation needs.',
    features: [
      'Unlimited database connections',
      'Unlimited workflow executions',
      'Custom workflow templates',
      'Dedicated support manager',
      'Enterprise security & compliance',
      'Advanced team management',
      'Full API access',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    mostPopular: false,
  },
]

export const Pricing = () => {
  const [annual, setAnnual] = useState(false)

  return (
    <div id="pricing" className="py-24 bg-gray-50 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-600">
            Pricing
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Choose the plan that's right for your business. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-16 flex justify-center">
          <div className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200">
            <button
              onClick={() => setAnnual(false)}
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                !annual ? 'bg-brand-600 text-white' : 'text-gray-500'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                annual ? 'bg-brand-600 text-white' : 'text-gray-500'
              }`}
            >
              Annual billing (save 17%)
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`flex flex-col justify-between rounded-3xl p-8 ring-1 xl:p-10 ${
                plan.mostPopular
                  ? 'ring-2 ring-brand-600 bg-white'
                  : 'ring-gray-200 bg-white'
              } lg:z-10 lg:rounded-b-none`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">
                    {plan.name}
                  </h3>
                  {plan.mostPopular && (
                    <p className="rounded-full bg-brand-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-brand-600">
                      Most popular
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {plan.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    ${annual ? plan.price.annually : plan.price.monthly}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">
                    /{annual ? 'year' : 'month'}
                  </span>
                </p>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon className="h-6 w-5 flex-none text-brand-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={plan.cta === 'Contact sales' ? '/contact' : 'https://app.nectar.com/signup'}
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  plan.mostPopular
                    ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-500 focus-visible:outline-brand-600'
                    : 'text-brand-600 ring-1 ring-inset ring-brand-200 hover:ring-brand-300'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### **C1.3: Lead Generation Forms**

**Contact Form (`components/forms/ContactForm.tsx`)**:
```typescript
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().min(2, 'Company name is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  source: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

export const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          source: 'contact_form',
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        reset()
        
        // Track conversion
        if (typeof window !== 'undefined' && (window as any).gtag) {
          ;(window as any).gtag('event', 'contact_form_submit', {
            event_category: 'engagement',
            event_label: 'contact_form',
          })
        }
      } else {
        throw new Error('Failed to submit form')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      alert('There was an error submitting your message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Thank you!</h3>
        <p className="mt-1 text-sm text-gray-600">
          We've received your message and will get back to you within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <div className="mt-1">
          <input
            {...register('name')}
            type="text"
            className="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <div className="mt-1">
          <input
            {...register('email')}
            type="email"
            className="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="your@company.com"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
          Company *
        </label>
        <div className="mt-1">
          <input
            {...register('company')}
            type="text"
            className="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Your company name"
          />
          {errors.company && (
            <p className="mt-2 text-sm text-red-600">{errors.company.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message *
        </label>
        <div className="mt-1">
          <textarea
            {...register('message')}
            rows={4}
            className="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Tell us about your automation needs..."
          />
          {errors.message && (
            <p className="mt-2 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" className="text-brand-600 hover:text-brand-500">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="/terms" className="text-brand-600 hover:text-brand-500">
          Terms of Service
        </a>
        .
      </p>
    </form>
  )
}
```

### **C1.4: Blog & Documentation System**

**Content Layer Configuration (`contentlayer.config.js`)**:
```javascript
import { defineDocumentType, makeSource } from 'contentlayer/source-files'

export const Post = defineDocumentType(() => ({
  name: 'Post',
  filePathPattern: `blog/**/*.mdx`,
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      description: 'The title of the post',
      required: true,
    },
    publishedAt: {
      type: 'date',
      description: 'The date of the post',
      required: true,
    },
    summary: {
      type: 'string',
      description: 'The summary of the post',
      required: true,
    },
    image: {
      type: 'string',
      description: 'The cover image of the post',
    },
    author: {
      type: 'string',
      description: 'The author of the post',
      required: true,
    },
    category: {
      type: 'string',
      description: 'The category of the post',
      required: true,
    },
    tags: {
      type: 'list',
      of: { type: 'string' },
      description: 'Tags for the post',
    },
  },
  computedFields: {
    url: {
      type: 'string',
      resolve: (doc) => `/blog/${doc._raw.flattenedPath.replace('blog/', '')}`,
    },
    slug: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.replace('blog/', ''),
    },
  },
}))

export const Doc = defineDocumentType(() => ({
  name: 'Doc',
  filePathPattern: `docs/**/*.mdx`,
  contentType: 'mdx',
  fields: {
    title: {
      type: 'string',
      description: 'The title of the documentation page',
      required: true,
    },
    description: {
      type: 'string',
      description: 'The description of the documentation page',
    },
    order: {
      type: 'number',
      description: 'The order of the page in navigation',
    },
    category: {
      type: 'string',
      description: 'The category of the documentation',
      required: true,
    },
  },
  computedFields: {
    url: {
      type: 'string',
      resolve: (doc) => `/docs/${doc._raw.flattenedPath.replace('docs/', '')}`,
    },
    slug: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.replace('docs/', ''),
    },
  },
}))

export default makeSource({
  contentDirPath: './content',
  documentTypes: [Post, Doc],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})
```

**Blog Page (`app/blog/page.tsx`)**:
```typescript
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { allPosts } from 'contentlayer/generated'
import { compareDesc, format } from 'date-fns'

export const metadata = {
  title: 'Blog - Nectar',
  description: 'Latest insights on automation, workflows, and business efficiency.',
}

export default function BlogPage() {
  const posts = allPosts.sort((a, b) => compareDesc(new Date(a.publishedAt), new Date(b.publishedAt)))

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-2xl lg:mx-0">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          From the blog
        </h2>
        <p className="mt-2 text-lg leading-8 text-gray-600">
          Learn about automation best practices, workflow optimization, and product updates.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="flex flex-col items-start justify-between"
          >
            {post.image && (
              <div className="relative w-full">
                <Image
                  src={post.image}
                  alt={post.title}
                  width={400}
                  height={200}
                  className="aspect-[16/9] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
              </div>
            )}
            <div className="max-w-xl">
              <div className="mt-8 flex items-center gap-x-4 text-xs">
                <time dateTime={post.publishedAt} className="text-gray-500">
                  {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
                </time>
                <span className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  {post.category}
                </span>
              </div>
              <div className="group relative">
                <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                  <Link href={post.url}>
                    <span className="absolute inset-0" />
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                  {post.summary}
                </p>
              </div>
              <div className="relative mt-8 flex items-center gap-x-4">
                <div className="text-sm leading-6">
                  <p className="font-semibold text-gray-900">
                    {post.author}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
```

---

## 📧 **Phase 2: Marketing Site Content & Features**

### **C2.1: API Routes for Form Handling**

**Contact Form API (`app/api/contact/route.ts`)**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(2),
  message: z.string().min(10),
  source: z.string().optional(),
  timestamp: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = contactSchema.parse(body)

    // Send notification email to sales team
    const salesEmail = {
      to: process.env.SALES_EMAIL || 'sales@nectar.com',
      from: process.env.FROM_EMAIL || 'noreply@nectar.com',
      subject: `New Contact Form Submission - ${data.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #0ea5e9;">New Contact Form Submission</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Company:</strong> ${data.company}</p>
            <p><strong>Source:</strong> ${data.source || 'Direct'}</p>
            <p><strong>Submitted:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          </div>

          <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3>Message:</h3>
            <p style="white-space: pre-wrap;">${data.message}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Next Steps:</strong> Follow up within 2 hours for best conversion rates.
            </p>
          </div>
        </div>
      `,
    }

    // Send welcome email to prospect
    const welcomeEmail = {
      to: data.email,
      from: process.env.FROM_EMAIL || 'noreply@nectar.com',
      subject: 'Thanks for contacting Nectar!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="text-align: center; padding: 20px;">
            <img src="https://nectar.com/logo.png" alt="Nectar" style="height: 40px;">
          </div>

          <h2 style="color: #0ea5e9;">Thanks for reaching out, ${data.name}!</h2>
          
          <p>We received your message and someone from our team will get back to you within 24 hours.</p>
          
          <p>In the meantime, here are some resources that might be helpful:</p>
          
          <ul>
            <li><a href="https://nectar.com/docs" style="color: #0ea5e9;">Documentation</a> - Get started guides and tutorials</li>
            <li><a href="https://nectar.com/demo" style="color: #0ea5e9;">Interactive Demo</a> - See Nectar in action</li>
            <li><a href="https://nectar.com/case-studies" style="color: #0ea5e9;">Case Studies</a> - How other companies use Nectar</li>
          </ul>

          <div style="margin: 30px 0; text-align: center;">
            <a href="https://app.nectar.com/signup" 
               style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Start Free Trial
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px;">
            Best regards,<br>
            The Nectar Team
          </p>
        </div>
      `,
    }

    // Send emails
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(salesEmail)
      await sgMail.send(welcomeEmail)
    }

    // Log to analytics (if available)
    if (process.env.ANALYTICS_WEBHOOK) {
      await fetch(process.env.ANALYTICS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'contact_form_submission',
          properties: {
            name: data.name,
            email: data.email,
            company: data.company,
            source: data.source,
            timestamp: data.timestamp,
          },
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
```

### **C2.2: Newsletter Signup API**

**Newsletter API (`app/api/newsletter/route.ts`)**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = newsletterSchema.parse(body)

    // Add to mailing list (example with Mailchimp)
    if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID) {
      const response = await fetch(
        `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_AUDIENCE_ID}/members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MAILCHIMP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: data.email,
            status: 'subscribed',
            tags: [data.source || 'website'],
            merge_fields: {
              SOURCE: data.source || 'website',
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to subscribe to newsletter')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter signup error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    )
  }
}
```

---

## 🔧 **Phase 3: Shared Database & API Services**

### **C3.1: Database Schema Review & Optimization**

**Database Performance Optimization (`shared-services/database/optimization.sql`)**:
```sql
-- Indexes for multi-tenant queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id 
ON users(organization_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_organization_created 
ON workflows(organization_id, created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_organization_status 
ON connections(organization_id, status) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_runs_organization_date 
ON workflow_runs(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_activity_organization_timestamp 
ON api_activity_logs(organization_id, timestamp DESC);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_email 
ON users(email) WHERE is_active = true AND email_verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active 
ON subscriptions(organization_id, status) WHERE status IN ('ACTIVE', 'TRIALING');

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_runs_status_org_date 
ON workflow_runs(status, organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_type_org_active 
ON connections(type, organization_id) WHERE is_active = true;

-- Database-level row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY tenant_isolation_users ON users
FOR ALL TO application_role
USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY tenant_isolation_workflows ON workflows
FOR ALL TO application_role
USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY tenant_isolation_connections ON connections
FOR ALL TO application_role
USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### **C3.2: Shared Authentication Service**

**Shared Auth Service (`shared-services/auth/authService.js`)**:
```javascript
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

class SharedAuthService {
  constructor() {
    this.prisma = new PrismaClient()
    this.customerJwtSecret = process.env.CUSTOMER_JWT_SECRET
    this.adminJwtSecret = process.env.ADMIN_JWT_SECRET
  }

  // Customer authentication
  async authenticateCustomer(email, password) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email, isActive: true },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                },
              },
            },
          },
        },
      })

      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        throw new Error('Invalid credentials')
      }

      if (!user.memberships || user.memberships.length === 0) {
        throw new Error('No organization access found')
      }

      const primaryMembership = user.memberships[0]
      const organization = primaryMembership.organization

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          organizationId: organization.id,
          role: primaryMembership.role,
          type: 'customer',
        },
        this.customerJwtSecret,
        { expiresIn: '24h' }
      )

      return {
        success: true,
        user,
        organization,
        membership: primaryMembership,
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Platform admin authentication
  async authenticateAdmin(email, password) {
    try {
      const admin = await this.prisma.platformAdmin.findUnique({
        where: { email, isActive: true },
      })

      if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
        throw new Error('Invalid credentials')
      }

      const token = jwt.sign(
        {
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          type: 'platform_admin',
        },
        this.adminJwtSecret,
        { expiresIn: '8h' }
      )

      return {
        success: true,
        admin,
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Verify customer token
  verifyCustomerToken(token) {
    try {
      const decoded = jwt.verify(token, this.customerJwtSecret)
      if (decoded.type !== 'customer') {
        throw new Error('Invalid token type')
      }
      return { success: true, decoded }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Verify admin token
  verifyAdminToken(token) {
    try {
      const decoded = jwt.verify(token, this.adminJwtSecret)
      if (decoded.type !== 'platform_admin') {
        throw new Error('Invalid token type')
      }
      return { success: true, decoded }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Cross-application user lookup (for admin portal)
  async getCustomerUser(userId) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    })
  }

  // Organization analytics (for admin portal)
  async getOrganizationStats(organizationId = null) {
    const whereClause = organizationId ? { organizationId } : {}

    const [users, workflows, connections] = await Promise.all([
      this.prisma.user.count({ where: { ...whereClause, isActive: true } }),
      this.prisma.workflow.count({ where: { ...whereClause, isActive: true } }),
      this.prisma.connection.count({ where: { ...whereClause, isActive: true } }),
    ])

    return {
      users,
      workflows,
      connections,
    }
  }
}

module.exports = new SharedAuthService()
```

### **C3.3: Shared Notification Service**

**Email/SMS Service (`shared-services/notifications/notificationService.js`)**:
```javascript
const sgMail = require('@sendgrid/mail')
const twilio = require('twilio')

class NotificationService {
  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    }
  }

  // Email templates
  getEmailTemplate(type, data) {
    const templates = {
      welcome: {
        subject: `Welcome to Nectar, ${data.name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1>Welcome to Nectar!</h1>
            <p>Hi ${data.name},</p>
            <p>Thanks for joining Nectar. You're now ready to start automating your workflows.</p>
            <a href="${data.loginUrl}" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Get Started
            </a>
          </div>
        `,
      },
      passwordReset: {
        subject: 'Reset your Nectar password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1>Reset Your Password</h1>
            <p>Hi ${data.name},</p>
            <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
            <a href="${data.resetUrl}" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </div>
        `,
      },
      workflowError: {
        subject: `Workflow "${data.workflowName}" failed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1 style="color: #dc2626;">Workflow Failed</h1>
            <p>Hi ${data.name},</p>
            <p>Your workflow "${data.workflowName}" failed to execute:</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px;">
              <p><strong>Error:</strong> ${data.error}</p>
              <p><strong>Time:</strong> ${data.timestamp}</p>
            </div>
            <a href="${data.workflowUrl}" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Workflow
            </a>
          </div>
        `,
      },
    }

    return templates[type]
  }

  // Send email
  async sendEmail(to, type, data, options = {}) {
    try {
      const template = this.getEmailTemplate(type, data)
      
      const msg = {
        to,
        from: options.from || process.env.FROM_EMAIL || 'noreply@nectar.com',
        subject: options.subject || template.subject,
        html: options.html || template.html,
        ...options,
      }

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg)
        return { success: true }
      } else {
        console.log('SendGrid not configured, email would be sent:', msg)
        return { success: false, error: 'Email service not configured' }
      }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }
  }

  // Send SMS
  async sendSMS(to, message, options = {}) {
    try {
      if (!this.twilioClient) {
        return { success: false, error: 'SMS service not configured' }
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        ...options,
      })

      return { success: true, messageId: result.sid }
    } catch (error) {
      console.error('SMS send error:', error)
      return { success: false, error: error.message }
    }
  }

  // Send notification (auto-chooses email or SMS)
  async sendNotification(recipient, type, data, options = {}) {
    if (recipient.email && (options.preferEmail || !recipient.phone)) {
      return this.sendEmail(recipient.email, type, data, options)
    } else if (recipient.phone) {
      const message = this.getSMSMessage(type, data)
      return this.sendSMS(recipient.phone, message, options)
    } else {
      return { success: false, error: 'No contact method available' }
    }
  }

  // SMS message templates
  getSMSMessage(type, data) {
    const messages = {
      workflowError: `Nectar Alert: Workflow "${data.workflowName}" failed. Check your dashboard for details.`,
      welcome: `Welcome to Nectar, ${data.name}! Start building workflows at ${data.loginUrl}`,
      passwordReset: `Your Nectar password reset link: ${data.resetUrl} (expires in 1 hour)`,
    }

    return messages[type] || `Nectar notification: ${data.message}`
  }
}

module.exports = new NotificationService()
```

---

## 🏗️ **Phase 4: Infrastructure & DevOps**

### **C4.1: Docker Configuration**

**Main Docker Compose (`infrastructure/docker/docker-compose.yml`)**:
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: nectar_db
      POSTGRES_USER: nectar
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - nectar-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nectar"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - nectar-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Marketing Site
  marketing-site:
    build:
      context: ../../nectar-marketing
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://app.nectar.com
      - NEXT_PUBLIC_ADMIN_URL=https://admin.nectarstudio.ai
      - DATABASE_URL=postgresql://nectar:${DB_PASSWORD}@postgres:5432/nectar_db
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - FROM_EMAIL=noreply@nectar.com
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - nectar-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.marketing.rule=Host(`nectar.com`)"
      - "traefik.http.routers.marketing.tls=true"
      - "traefik.http.routers.marketing.tls.certresolver=letsencrypt"

  # Customer Application
  customer-app:
    build:
      context: ../../nectar-customer-app
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://nectar:${DB_PASSWORD}@postgres:5432/nectar_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${CUSTOMER_JWT_SECRET}
      - CORS_ORIGINS=https://app.nectar.com
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - nectar-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.customer-app.rule=Host(`app.nectar.com`)"
      - "traefik.http.routers.customer-app.tls=true"
      - "traefik.http.routers.customer-app.tls.certresolver=letsencrypt"

  # Platform Admin Portal
  admin-portal:
    build:
      context: ../../nectar-admin-portal
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://nectar:${DB_PASSWORD}@postgres:5432/nectar_db
      - ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
      - CUSTOMER_DATABASE_URL=postgresql://nectar:${DB_PASSWORD}@postgres:5432/nectar_db
      - CORS_ORIGINS=https://admin.nectarstudio.ai
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - nectar-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin-portal.rule=Host(`admin.nectarstudio.ai`)"
      - "traefik.http.routers.admin-portal.tls=true"
      - "traefik.http.routers.admin-portal.tls.certresolver=letsencrypt"

  # Reverse Proxy (Traefik)
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--global.checknewversion=false"
      - "--global.sendanonymoususage=false"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    networks:
      - nectar-network

  # Monitoring (Prometheus)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - nectar-network

  # Monitoring (Grafana)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3003:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - nectar-network

volumes:
  postgres_data:
  letsencrypt:
  prometheus_data:
  grafana_data:

networks:
  nectar-network:
    driver: bridge
```

### **C4.2: Terraform Infrastructure**

**Main Terraform Configuration (`infrastructure/terraform/main.tf`)**:
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "nectar-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "nectar-igw"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "nectar-public-${count.index + 1}"
    Environment = var.environment
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "nectar-private-${count.index + 1}"
    Environment = var.environment
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "nectar-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "web" {
  name        = "nectar-web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict this to your IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "nectar-web-sg"
    Environment = var.environment
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "nectar-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "nectar-db-subnet-group"
    Environment = var.environment
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier             = "nectar-postgres"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_encrypted      = true

  db_name  = "nectar_db"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment == "development"
  deletion_protection = var.environment == "production"

  tags = {
    Name = "nectar-postgres"
    Environment = var.environment
  }
}

resource "aws_security_group" "database" {
  name        = "nectar-database-sg"
  description = "Security group for database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  tags = {
    Name = "nectar-database-sg"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "nectar-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name = "nectar-alb"
    Environment = var.environment
  }
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "files" {
  bucket = "nectar-files-${var.environment}"

  tags = {
    Name = "nectar-files"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "nectar-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "Nectar CDN"

  aliases = var.domain_names

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "nectar-alb"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method  = "sni-only"
  }

  tags = {
    Name = "nectar-cdn"
    Environment = var.environment
  }
}
```

### **C4.3: Monitoring & Logging**

**Prometheus Configuration (`infrastructure/prometheus.yml`)**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  # Self monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter
  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']

  # Application metrics
  - job_name: 'marketing-site'
    static_configs:
      - targets: ['marketing-site:3000']
    metrics_path: '/api/metrics'

  - job_name: 'customer-app'
    static_configs:
      - targets: ['customer-app:3000']
    metrics_path: '/api/metrics'

  - job_name: 'admin-portal'
    static_configs:
      - targets: ['admin-portal:3000']
    metrics_path: '/api/metrics'

  # Database monitoring
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  # Redis monitoring
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

---

## 🚀 **Phase 5: Deployment & Security**

### **C5.1: CI/CD Pipeline**

**GitHub Actions Workflow (`.github/workflows/deploy.yml`)**:
```yaml
name: Deploy Nectar Applications

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io

jobs:
  # Marketing Site Deployment
  deploy-marketing:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: nectar-marketing/package-lock.json

      - name: Install dependencies
        run: |
          cd nectar-marketing
          npm ci

      - name: Build application
        run: |
          cd nectar-marketing
          npm run build
        env:
          NEXT_PUBLIC_APP_URL: https://app.nectar.com
          NEXT_PUBLIC_ADMIN_URL: https://admin.nectarstudio.ai

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./nectar-marketing
          production: true

  # Customer App Deployment
  deploy-customer-app:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: nectar-customer-app/package-lock.json

      - name: Run tests
        run: |
          cd nectar-customer-app
          npm ci
          npm run test

      - name: Build Docker image
        run: |
          cd nectar-customer-app
          docker build -t ${{ env.REGISTRY }}/nectar-customer-app:latest .

      - name: Push to registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ${{ env.REGISTRY }} -u ${{ github.actor }} --password-stdin
          docker push ${{ env.REGISTRY }}/nectar-customer-app:latest

      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/nectar
            docker-compose pull customer-app
            docker-compose up -d customer-app

  # Admin Portal Deployment
  deploy-admin-portal:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: nectar-admin-portal/package-lock.json

      - name: Run tests
        run: |
          cd nectar-admin-portal
          npm ci
          npm run test

      - name: Build Docker image
        run: |
          cd nectar-admin-portal
          docker build -t ${{ env.REGISTRY }}/nectar-admin-portal:latest .

      - name: Push to registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ${{ env.REGISTRY }} -u ${{ github.actor }} --password-stdin
          docker push ${{ env.REGISTRY }}/nectar-admin-portal:latest

      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/nectar
            docker-compose pull admin-portal
            docker-compose up -d admin-portal

  # Database migrations
  run-migrations:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [deploy-customer-app, deploy-admin-portal]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run database migrations
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/nectar
            docker-compose exec -T customer-app npx prisma migrate deploy
```

### **C5.2: Security Configuration**

**Security Headers Middleware (`shared-services/security/securityHeaders.js`)**:
```javascript
const helmet = require('helmet')

const securityHeaders = (app) => {
  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-eval'", "https://www.googletagmanager.com"],
        connectSrc: ["'self'", "https://api.nectar.com", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for better compatibility
  }))

  // Additional security headers
  app.use((req, res, next) => {
    // Prevent caching of sensitive pages
    if (req.path.includes('/admin') || req.path.includes('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    }

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    next()
  })
}

module.exports = { securityHeaders }
```

---

## 📊 **Success Metrics & Monitoring**

### **Key Performance Indicators**

**Marketing Site:**
- Page load speed < 1.5s
- Lighthouse score > 95
- Conversion rate > 3%
- Bounce rate < 60%

**Customer Application:**
- API response time < 500ms
- Uptime > 99.9%
- Error rate < 0.1%
- Customer satisfaction > 4.5/5

**Admin Portal:**
- Dashboard load time < 2s
- Cross-tenant queries < 1s
- Support resolution time < 4h
- Admin task efficiency +40%

---

This comprehensive guide provides everything needed to build a professional marketing website and manage the shared infrastructure that supports all three Nectar applications.

---

## Addendum: Billing with Stripe and Security Hardening

The following updates complete Stripe billing for the marketing site and tighten security across infra and app layers.

### Stripe Checkout and Webhooks

- Add `app/api/checkout/route.ts` and `app/api/stripe/webhook/route.ts` in the marketing site. Use Stripe Checkout for subscriptions and verify webhook signatures.
- Environment variables per environment:
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PROFESSIONAL`, `STRIPE_PRICE_ID_ENTERPRISE`
- Pricing CTA should POST to `/api/checkout` and redirect to `session.url`.

Example `app/api/checkout/route.ts` (Node 18/Next.js App Router):

```ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const schema = z.object({ priceId: z.string(), billingCycle: z.enum(['monthly','annual']).default('monthly'), email: z.string().email().optional(), trialDays: z.number().min(0).max(30).optional() })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: body.email,
      line_items: [{ price: body.priceId, quantity: 1 }],
      subscription_data: body.trialDays ? { trial_period_days: body.trialDays } : undefined,
      automatic_tax: { enabled: true },
      success_url: 'https://app.nectar.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.nectar.com/billing/cancelled',
      metadata: { source: 'marketing_site' },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Checkout error:', e)
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 400 })
  }
}
```

Webhook `app/api/stripe/webhook/route.ts` should construct the event with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`, handle `checkout.session.completed`, `customer.subscription.*`, and `invoice.*` events, and ensure idempotency.

### Security Hardening

- Traefik dashboard: remove `--api.insecure=true`. If you need the dashboard, secure it and do not expose publicly. Example minimal flags:

```yaml
command:
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.websecure.address=:443"
  - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
  - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
```

- Terraform SSH Security Group: lock port 22 to a variable rather than `0.0.0.0/0`.

```hcl
variable "ssh_allowed_cidr" { type = string }

resource "aws_security_group" "web" {
  # ...
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr] // e.g., your office IP
  }
}
```

- Marketing site headers: add HSTS and a strict CSP in `next.config.js` via `headers()`; avoid `unsafe-eval` and prefer nonces/hashes.
- Public APIs (`/api/contact`, `/api/newsletter`, `/api/checkout`): add IP rate limiting and CAPTCHA (hCaptcha/Recaptcha) verification.
- CloudFront: avoid forwarding all cookies/headers by default; define restrictive cache policies.
