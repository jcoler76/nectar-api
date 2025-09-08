const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const { PrismaClient } = require('../../prisma/generated/client')
const bcrypt = require('bcryptjs')

async function main() {
  const prisma = new PrismaClient()
  const email = process.argv[2] || '<email>'
  const password = process.argv[3] || '<password>'
  const firstName = process.argv[4] || 'Jestin'
  const lastName = process.argv[5] || 'Coler'

  try {
    await prisma.$connect()
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'))
    const existing = await prisma.platformAdmin.findUnique({ where: { email } })
    if (existing) {
      await prisma.platformAdmin.update({
        where: { email },
        data: { firstName, lastName, passwordHash: hash, isActive: true },
      })
      console.log(`Updated admin: ${email}`)
    } else {
      await prisma.platformAdmin.create({
        data: { email, passwordHash: hash, firstName, lastName, role: 'SUPER_ADMIN', isActive: true },
      })
      console.log(`Created admin: ${email}`)
    }
  } catch (e) {
    console.error('Failed to create admin:', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
