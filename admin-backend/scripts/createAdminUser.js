const { PrismaClient } = require('../prisma/generated/client')
const bcrypt = require('bcryptjs')
const path = require('path')

// Use the admin backend's Prisma client
const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...')

    const email = 'meadminportal@jestincoler.com'
    const password = 'Fr33d0M!!@!NC'
    const firstName = 'Jestin'
    const lastName = 'Coler'
    const role = 'SUPER_ADMIN'

    // Check if user already exists
    const existingAdmin = await prisma.platformAdmin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      console.log(`⚠️  Admin user ${email} already exists`)
      console.log(`🔄 Updating password...`)
      
      const passwordHash = await bcrypt.hash(password, 12)
      
      const updatedAdmin = await prisma.platformAdmin.update({
        where: { email },
        data: {
          passwordHash,
          isActive: true,
          updatedAt: new Date()
        }
      })

      console.log('✅ Admin user password updated successfully')
      console.log(`📧 Email: ${updatedAdmin.email}`)
      console.log(`👤 Name: ${updatedAdmin.firstName} ${updatedAdmin.lastName}`)
      console.log(`🎭 Role: ${updatedAdmin.role}`)
      console.log(`🌐 Admin Portal: http://localhost:3002`)
      console.log(`🔗 Backend API: http://localhost:4001`)
      
      return updatedAdmin
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the admin user
    const admin = await prisma.platformAdmin.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        isActive: true
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log(`📧 Email: ${admin.email}`)
    console.log(`👤 Name: ${admin.firstName} ${admin.lastName}`)
    console.log(`🎭 Role: ${admin.role}`)
    console.log(`🆔 ID: ${admin.id}`)
    console.log(`🌐 Admin Portal: http://localhost:3002`)
    console.log(`🔗 Backend API: http://localhost:4001`)
    console.log('')
    console.log('🚀 You can now log in to the admin portal!')

    return admin

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createAdminUser()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })