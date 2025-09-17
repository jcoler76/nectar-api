import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import { AdminAuthService } from '../src/services/adminAuth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding platform admin database...')

  try {
    // Check if any admins exist
    const existingAdmin = await prisma.platformAdmin.findFirst()
    
    if (existingAdmin) {
      console.log('✅ Admin users already exist, skipping seed')
      return
    }

    // Create super admin user with secure password from environment
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(32).toString('hex')
    const superAdmin = await AdminAuthService.createAdmin({
      email: 'admin.nectarstudio.ai',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    })

    console.log('✅ Created super admin:', superAdmin.email)

    // Create regular admin user with secure password
    const supportPassword = process.env.SUPPORT_SEED_PASSWORD || crypto.randomBytes(32).toString('hex')
    const regularAdmin = await AdminAuthService.createAdmin({
      email: 'support@nectarstudio.ai',
      password: supportPassword,
      firstName: 'Support',
      lastName: 'Team',
      role: 'ADMIN',
    })

    console.log('✅ Created admin user:', regularAdmin.email)

    // Create viewer user with secure password
    const viewerPassword = process.env.VIEWER_SEED_PASSWORD || crypto.randomBytes(32).toString('hex')
    const viewerUser = await AdminAuthService.createAdmin({
      email: 'viewer@nectar.com',
      password: viewerPassword,
      firstName: 'Read Only',
      lastName: 'User',
      role: 'VIEWER',
    })

    console.log('✅ Created viewer user:', viewerUser.email)

    // Create some initial system configurations
    const systemConfigs = [
      {
        key: 'allow_user_registration',
        value: true,
        description: 'Allow new users to register for accounts',
      },
      {
        key: 'require_email_verification',
        value: true,
        description: 'Require users to verify their email before accessing the platform',
      },
      {
        key: 'api_rate_limit_per_minute',
        value: 100,
        description: 'Maximum API requests per minute per user',
      },
      {
        key: 'workflow_execution_limit',
        value: 10,
        description: 'Maximum concurrent workflow executions per organization',
      },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Enable maintenance mode to prevent user access',
      },
    ]

    for (const config of systemConfigs) {
      await prisma.systemConfig.create({
        data: config,
      })
    }

    console.log('✅ Created system configurations')

    // Create a sample platform announcement
    await prisma.platformAnnouncement.create({
      data: {
        title: 'Welcome to Admin Portal - NectarStudio.ai',
        message: 'The platform administration portal is now active. Use this system to monitor organizations, manage users, and configure platform settings.',
        type: 'INFO',
        targetAudience: 'all',
        targetOrgs: [],
        createdBy: superAdmin.id,
        scheduledFor: new Date(),
      },
    })

    console.log('✅ Created welcome announcement')

    console.log('\n🎉 Seeding completed successfully!')
    console.log('\n📋 Admin accounts created:')
    console.log('   Super Admin: admin.nectarstudio.ai')
    console.log('   Admin: support@nectarstudio.ai')
    console.log('   Viewer: viewer@nectar.com')
    if (!process.env.ADMIN_SEED_PASSWORD) {
      console.log('\n⚠️  IMPORTANT: Random passwords were generated. Set ADMIN_SEED_PASSWORD, SUPPORT_SEED_PASSWORD, and VIEWER_SEED_PASSWORD environment variables for consistent passwords.')
      console.log('   Generated admin password:', adminPassword)
      console.log('   Generated support password:', supportPassword)
      console.log('   Generated viewer password:', viewerPassword)
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })