# Marketing Site & Infrastructure Setup Guide (Silo C)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Git
- Docker & Docker Compose
- AWS CLI (for production deployment)
- Terraform (for infrastructure as code)

### 1. Create Marketing Site Repository
```bash
mkdir nectar-marketing
cd nectar-marketing
git init
git remote add origin <your-marketing-repo>
```

### 2. Initialize Next.js Marketing Site
```bash
# Create Next.js project with TypeScript
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Additional marketing-specific dependencies
npm install @next/mdx @mdx-js/loader @mdx-js/react
npm install next-seo next-sitemap
npm install framer-motion lucide-react
npm install @headlessui/react @heroicons/react
npm install sharp # for optimized images
npm install gray-matter remark remark-html # for blog
npm install @vercel/analytics @vercel/speed-insights # for analytics

# CMS integration (choose one)
npm install @sanity/client next-sanity
# OR
npm install contentful

# Email/newsletter
npm install @sendgrid/mail
npm install react-hook-form @hookform/resolvers zod
```

### 3. Shared Services Setup
```bash
mkdir shared-services
cd shared-services

# Initialize shared authentication service
npm init -y
npm install fastify @fastify/cors @fastify/jwt
npm install prisma @prisma/client
npm install redis ioredis
npm install nodemailer @sendgrid/mail
npm install winston
npm install helmet compression

# Development dependencies
npm install -D typescript @types/node ts-node nodemon
npm install -D jest @types/jest supertest
```

## 📁 Project Structure

```
nectar-marketing/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/       # Marketing pages
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── pricing/       # Pricing page
│   │   │   ├── features/      # Feature pages
│   │   │   ├── about/         # About page
│   │   │   └── contact/       # Contact page
│   │   ├── blog/              # Blog section
│   │   ├── docs/              # Documentation
│   │   ├── legal/             # Legal pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── marketing/         # Marketing-specific components
│   │   ├── blog/              # Blog components
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── cms.ts             # CMS integration
│   │   ├── analytics.ts       # Analytics helpers
│   │   └── email.ts           # Email services
│   └── styles/
│       └── globals.css        # Global styles
├── content/                   # Static content (MDX)
│   ├── blog/                  # Blog posts
│   └── docs/                  # Documentation
├── public/
│   ├── images/                # Marketing images
│   └── assets/                # Other assets
├── shared-services/           # Shared backend services
│   ├── auth-service/          # Shared authentication
│   ├── notification-service/  # Email/notifications
│   ├── file-service/          # File uploads
│   └── analytics-service/     # Usage analytics
└── infrastructure/            # Infrastructure as Code
    ├── terraform/             # Terraform configs
    ├── docker/                # Docker configurations
    └── k8s/                   # Kubernetes manifests
```

## 🎨 Marketing Site Configuration

### Next.js Config (`next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
  },
  images: {
    domains: ['cdn.sanity.io', 'images.unsplash.com'],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      {
        source: '/app',
        destination: 'https://app.nectar.com',
        permanent: true,
      },
      {
        source: '/admin',
        destination: 'https://admin.nectarstudio.ai',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

const withMDX = require('@next/mdx')()
module.exports = withMDX(nextConfig)
```

### Homepage Component (`src/app/(marketing)/page.tsx`)
```typescript
import { Metadata } from 'next'
import { HeroSection } from '@/components/marketing/HeroSection'
import { FeaturesSection } from '@/components/marketing/FeaturesSection'
import { PricingSection } from '@/components/marketing/PricingSection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { CTASection } from '@/components/marketing/CTASection'

export const metadata: Metadata = {
  title: 'Nectar - Streamline Your Business Workflows',
  description: 'Connect your apps, automate your processes, and boost productivity with Nectar\'s powerful workflow automation platform.',
  openGraph: {
    title: 'Nectar - Workflow Automation Platform',
    description: 'Streamline your business with powerful workflow automation',
    images: ['/images/og-image.jpg'],
  },
}

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
    </main>
  )
}
```

### Hero Section (`src/components/marketing/HeroSection.tsx`)
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Streamline Your Business 
              <span className="text-yellow-400"> Workflows</span>
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Connect your favorite apps, automate repetitive tasks, and boost 
              your team's productivity with Nectar's intuitive workflow platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-yellow-400 text-blue-900 hover:bg-yellow-300">
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900">
                  Watch Demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-6 text-sm text-blue-100">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="h-4 bg-white/20 rounded animate-pulse" />
                <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse delay-100" />
                <div className="h-4 bg-white/20 rounded w-1/2 animate-pulse delay-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

### Free Trial Signup API (`src/app/api/signup/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  company: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, company } = signupSchema.parse(body)

    // Create user in customer application
    const response = await fetch('https://app.nectar.com/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        company,
        source: 'marketing_site',
        trialPlan: 'pro'
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create account')
    }

    const userData = await response.json()

    // Send welcome email
    await sendWelcomeEmail(email, name)

    return NextResponse.json({ 
      success: true, 
      redirectUrl: `https://app.nectar.com/onboarding?token=${userData.token}` 
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 })
  }
}
```

## 🔧 Shared Services Setup

### Shared Authentication Service (`shared-services/auth-service/src/server.ts`)
```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const server = Fastify({ logger: true })
const prisma = new PrismaClient()

// Register plugins
await server.register(cors, {
  origin: [
    'https://nectar.com',
    'https://app.nectar.com', 
    'https://admin.nectarstudio.ai',
    /^https:\/\/[\w-]+\.nectar\.com$/
  ]
})

await server.register(jwt, {
  secret: process.env.SHARED_JWT_SECRET!
})

// Shared authentication routes
server.post('/api/auth/validate-token', async (request, reply) => {
  try {
    const { token, requiredRole } = request.body as { token: string, requiredRole?: string }
    
    const decoded = server.jwt.verify(token) as any
    
    // Fetch user with current data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        organizations: {
          include: {
            members: true
          }
        }
      }
    })

    if (!user) {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    // Check role if required
    if (requiredRole) {
      const hasRole = checkUserRole(user, requiredRole)
      if (!hasRole) {
        return reply.status(403).send({ error: 'Insufficient permissions' })
      }
    }

    return { valid: true, user }
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' })
  }
})

// Cross-application user lookup
server.get('/api/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        organizations: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return user
  } catch (error) {
    return reply.status(500).send({ error: 'Internal server error' })
  }
})

const start = async () => {
  try {
    await server.listen({ port: 9000, host: '0.0.0.0' })
    console.log('🔐 Shared auth service running on port 9000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

### Notification Service (`shared-services/notification-service/src/emailService.ts`)
```typescript
import sgMail from '@sendgrid/mail'
import { PrismaClient } from '@prisma/client'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
const prisma = new PrismaClient()

export class EmailService {
  static async sendWelcomeEmail(email: string, name: string) {
    const msg = {
      to: email,
      from: 'welcome@nectar.com',
      subject: 'Welcome to Nectar!',
      templateId: 'd-welcome-template-id',
      dynamicTemplateData: {
        name,
        loginUrl: 'https://app.nectar.com/login',
        supportUrl: 'https://nectar.com/support',
      },
    }

    try {
      await sgMail.send(msg)
      
      // Log email send
      await prisma.emailLog.create({
        data: {
          recipient: email,
          subject: msg.subject,
          templateId: msg.templateId,
          status: 'SENT',
          sentAt: new Date(),
        }
      })
    } catch (error) {
      console.error('Failed to send welcome email:', error)
      
      await prisma.emailLog.create({
        data: {
          recipient: email,
          subject: msg.subject,
          templateId: msg.templateId,
          status: 'FAILED',
          error: error.message,
          sentAt: new Date(),
        }
      })
      
      throw error
    }
  }

  static async sendOrganizationInvitation(email: string, organizationName: string, inviteToken: string) {
    const msg = {
      to: email,
      from: 'invites@nectar.com',
      subject: `You've been invited to join ${organizationName}`,
      templateId: 'd-invitation-template-id',
      dynamicTemplateData: {
        organizationName,
        acceptUrl: `https://app.nectar.com/invite/accept?token=${inviteToken}`,
        organizationOwner: 'Organization Admin',
      },
    }

    await sgMail.send(msg)
  }

  static async sendPasswordReset(email: string, resetToken: string) {
    const msg = {
      to: email,
      from: 'security@nectar.com',
      subject: 'Reset your Nectar password',
      templateId: 'd-password-reset-template-id',
      dynamicTemplateData: {
        resetUrl: `https://app.nectar.com/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
      },
    }

    await sgMail.send(msg)
  }
}
```

## 🏗️ Infrastructure as Code

### Docker Compose for Development (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  marketing-site:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_APP_URL=http://localhost:3001
      - NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXXXX

  auth-service:
    build:
      context: ./shared-services/auth-service
      dockerfile: Dockerfile.dev
    ports:
      - "9000:9000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nectar_shared
      - SHARED_JWT_SECRET=shared-development-secret
    depends_on:
      - postgres
      - redis

  notification-service:
    build:
      context: ./shared-services/notification-service
      dockerfile: Dockerfile.dev
    ports:
      - "9001:9001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nectar_shared
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=nectar_shared
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Terraform Infrastructure (`infrastructure/terraform/main.tf`)
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for marketing site static assets
resource "aws_s3_bucket" "marketing_assets" {
  bucket = "nectar-marketing-assets-${var.environment}"
}

# CloudFront distribution for marketing site
resource "aws_cloudfront_distribution" "marketing_site" {
  origin {
    domain_name = aws_s3_bucket.marketing_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.marketing_assets.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.marketing.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["nectar.com", "www.nectar.com"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.marketing_assets.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.nectar_cert.arn
    ssl_support_method  = "sni-only"
  }
}

# Application Load Balancer for backend services
resource "aws_lb" "shared_services" {
  name               = "nectar-shared-services-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"
}

# ECS cluster for shared services
resource "aws_ecs_cluster" "shared_services" {
  name = "nectar-shared-services-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS instance for shared database
resource "aws_db_instance" "shared_database" {
  identifier = "nectar-shared-${var.environment}"
  
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = var.db_instance_class
  
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  
  db_name  = "nectar_shared"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.shared.name
  
  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = var.environment == "production"
  
  tags = {
    Name        = "nectar-shared-${var.environment}"
    Environment = var.environment
  }
}
```

## 📋 Deployment Scripts

### Marketing Site Deployment (`scripts/deploy-marketing.sh`)
```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🚀 Deploying marketing site to $ENVIRONMENT..."

# Build Next.js site
npm run build

# Export static files
npm run export

# Upload to S3
aws s3 sync ./out s3://nectar-marketing-assets-$ENVIRONMENT --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='nectar.com'].Id" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ Marketing site deployed successfully!"
echo "🌐 Available at: https://nectar.com"
```

### Shared Services Deployment (`scripts/deploy-services.sh`)
```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
SERVICES=("auth-service" "notification-service" "file-service")

echo "🚀 Deploying shared services to $ENVIRONMENT..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Deploying $SERVICE..."
  
  # Build Docker image
  docker build -t nectar-$SERVICE:$ENVIRONMENT ./shared-services/$SERVICE
  
  # Tag for ECR
  docker tag nectar-$SERVICE:$ENVIRONMENT $ECR_REGISTRY/nectar-$SERVICE:$ENVIRONMENT
  
  # Push to ECR
  docker push $ECR_REGISTRY/nectar-$SERVICE:$ENVIRONMENT
  
  # Update ECS service
  aws ecs update-service \
    --cluster nectar-shared-services-$ENVIRONMENT \
    --service nectar-$SERVICE-$ENVIRONMENT \
    --force-new-deployment
done

echo "✅ All shared services deployed successfully!"
```

## 🧪 Testing & Quality Assurance

### Marketing Site Tests (`__tests__/pages/index.test.tsx`)
```typescript
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/(marketing)/page'

describe('Marketing Homepage', () => {
  it('renders hero section', () => {
    render(<HomePage />)
    
    expect(screen.getByText(/Streamline Your Business/i)).toBeInTheDocument()
    expect(screen.getByText(/Start Free Trial/i)).toBeInTheDocument()
  })

  it('includes pricing section', () => {
    render(<HomePage />)
    
    expect(screen.getByText(/pricing/i)).toBeInTheDocument()
  })

  it('has proper SEO meta tags', () => {
    // Test meta tags are properly set
    expect(document.title).toContain('Nectar')
  })
})
```

## 🚀 Development Commands

```bash
# 1. Setup marketing site
git clone <marketing-repo> nectar-marketing
cd nectar-marketing
npm install

# 2. Setup shared services
cd shared-services
npm install

# 3. Start development environment
docker-compose up -d

# 4. Start marketing site development server
npm run dev # Marketing site on http://localhost:3000

# 5. Shared services will be running on:
# - Auth service: http://localhost:9000
# - Notification service: http://localhost:9001

# 6. Build and test
npm run build
npm test

# 7. Deploy to staging
./scripts/deploy-marketing.sh staging
./scripts/deploy-services.sh staging
```

## 📊 Success Metrics

### Marketing Site KPIs
- [ ] Page load speed < 1.5s
- [ ] Google Lighthouse score > 95
- [ ] Conversion rate > 3% (visitor to trial)
- [ ] Bounce rate < 40%
- [ ] SEO ranking for target keywords

### Infrastructure Metrics  
- [ ] 99.9% uptime for all services
- [ ] API response times < 200ms
- [ ] Database queries < 100ms average
- [ ] CDN cache hit ratio > 90%
- [ ] Zero security vulnerabilities

This setup guide provides everything needed to build a high-performance marketing site with robust shared infrastructure supporting all three applications in the Nectar ecosystem.

---

## Addendum: Billing with Stripe and Security Updates (Required)

This addendum finalizes Stripe billing and strengthens security for public APIs and headers.

### Updated Next.js Security Headers

Use strict headers including HSTS and a baseline CSP. Replace your `headers()` in `next.config.js` with:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; img-src 'self' https: data: blob:; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.nectar.com; frame-ancestors 'none'; object-src 'none'",
        },
      ],
    },
  ]
}
```

Tune the CSP per the exact third-party domains you use; avoid `unsafe-*` where possible.

### Update: Free Trial Signup Flow (No tokens in URLs)

Avoid placing tokens in query parameters. Prefer sending a welcome email with a magic link from the customer app and returning a simple success response:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, company } = signupSchema.parse(body)

    const response = await fetch('https://app.nectar.com/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, company, source: 'marketing_site', trialPlan: 'pro' }),
    })

    if (!response.ok) throw new Error('Failed to create account')

    await sendWelcomeEmail(email, name)
    return NextResponse.json({ success: true }) // No token in URL
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
```

### Stripe Billing Integration (Marketing Site)

1) Install Stripe: `npm install stripe`

2) Create `app/api/checkout/route.ts` to start a Checkout Session:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const bodySchema = z.object({ priceId: z.string(), billingCycle: z.enum(['monthly', 'annual']).default('monthly'), email: z.string().email().optional(), trialDays: z.number().min(0).max(30).optional() })

export async function POST(req: NextRequest) {
  try {
    const data = bodySchema.parse(await req.json())
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      customer_email: data.email,
      line_items: [{ price: data.priceId, quantity: 1 }],
      subscription_data: data.trialDays ? { trial_period_days: data.trialDays } : undefined,
      automatic_tax: { enabled: true },
      success_url: 'https://app.nectar.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.nectar.com/billing/cancelled',
      metadata: { source: 'marketing_site' },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Create checkout session error:', err)
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 400 })
  }
}
```

3) Add `app/api/stripe/webhook/route.ts` to handle Stripe webhooks with signature verification:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const config = { api: { bodyParser: false } } as const

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const raw = Buffer.from(await req.arrayBuffer())
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // TODO: mark subscription active in your DB by session.subscription/customer
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        // TODO: synchronize subscription/invoice state in your DB
        break
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
```

4) Wire the Pricing CTA to call `/api/checkout` and redirect to `data.url`.

5) Add environment variables (per environment):
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PROFESSIONAL`, `STRIPE_PRICE_ID_ENTERPRISE`

6) Protect public endpoints with basic rate limiting and CAPTCHA verification (`/api/checkout`, `/api/contact`, `/api/newsletter`).

### Docker Compose (env additions)

Add the following for the marketing site service:

```yaml
environment:
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```
