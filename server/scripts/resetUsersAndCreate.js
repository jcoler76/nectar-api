/*
  Reset users and create a single test user for Nectar Studio
  - Deletes all memberships and users
  - Upserts Organization: "Nectar Studio" (slug: "nectar-studio")
  - Creates user: email provided via CLI or defaults
  - Creates OWNER membership linking the user to the organization

  Usage:
    node server/scripts/resetUsersAndCreate.js [email] [password] [firstName] [lastName]

  Defaults:
    email:    <email>
    password: <password>
    name:     Jestin Coler
*/

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

// Reuse shared Prisma client to match the live DB schema
const { PrismaClient } = require('../../prisma/generated/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

async function main() {
  const prisma = new PrismaClient()

  const email = process.argv[2] || '<email>'
  const password = process.argv[3] || '<password>'
  const firstName = process.argv[4] || 'Jestin'
  const lastName = process.argv[5] || 'Coler'

  console.log('--- Resetting users and creating test account ---')
  console.log('Database URL:', process.env.DATABASE_URL ? '[set]' : '[missing]')

  try {
    // Ensure connection
    await prisma.$connect()
    console.log('Connected to PostgreSQL via Prisma')

    // Delete memberships first (FK to users)
    const delMemberships = await prisma.membership.deleteMany({})
    console.log(`Deleted memberships: ${delMemberships.count}`)

    // Invitation and AuditLog models are not present in the admin-backend schema.
    // Skip cleaning those to keep this script aligned with the live schema.

    // Delete users
    const delUsers = await prisma.user.deleteMany({})
    console.log(`Deleted users: ${delUsers.count}`)

    // Upsert organization
    const orgSlug = 'nectar-studio'
    const organization = await prisma.organization.upsert({
      where: { slug: orgSlug },
      update: { name: 'Nectar Studio', updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        name: 'Nectar Studio',
        slug: orgSlug,
        updatedAt: new Date(),
      },
    })
    console.log(`Organization ready: ${organization.name} (${organization.id})`)

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        firstName,
        lastName,
        isActive: true,
        emailVerified: true,
        updatedAt: new Date(),
      },
    })
    console.log(`User created: ${user.email} (${user.id})`)

    // Create OWNER membership
    const membership = await prisma.membership.create({
      data: {
        id: crypto.randomUUID(),
        role: 'OWNER',
        userId: user.id,
        organizationId: organization.id,
      },
      include: { organization: true },
    })
    console.log(`Membership created: ${membership.role} @ ${membership.organization.name}`)

    console.log('\nDone. You can now log in with:')
    console.log(`  Email:    ${email}`)
    console.log('  Password: [as provided]')
  } catch (error) {
    console.error('Error resetting users/creating test account:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
