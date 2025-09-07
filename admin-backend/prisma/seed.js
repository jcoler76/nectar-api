"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adminAuth_1 = require("../src/services/adminAuth");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding platform admin database...');
    try {
        // Check if any admins exist
        const existingAdmin = await prisma.platformAdmin.findFirst();
        if (existingAdmin) {
            console.log('✅ Admin users already exist, skipping seed');
            return;
        }
        // Create super admin user
        const superAdmin = await adminAuth_1.AdminAuthService.createAdmin({
            email: 'admin@nectar.com',
            password: 'AdminPassword123!',
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
        });
        console.log('✅ Created super admin:', superAdmin.email);
        // Create regular admin user
        const regularAdmin = await adminAuth_1.AdminAuthService.createAdmin({
            email: 'support@nectar.com',
            password: 'SupportPassword123!',
            firstName: 'Support',
            lastName: 'Team',
            role: 'ADMIN',
        });
        console.log('✅ Created admin user:', regularAdmin.email);
        // Create viewer user
        const viewerUser = await adminAuth_1.AdminAuthService.createAdmin({
            email: 'viewer@nectar.com',
            password: 'ViewerPassword123!',
            firstName: 'Read Only',
            lastName: 'User',
            role: 'VIEWER',
        });
        console.log('✅ Created viewer user:', viewerUser.email);
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
        ];
        for (const config of systemConfigs) {
            await prisma.systemConfig.create({
                data: config,
            });
        }
        console.log('✅ Created system configurations');
        // Create a sample platform announcement
        await prisma.platformAnnouncement.create({
            data: {
                title: 'Welcome to Nectar Admin Portal',
                message: 'The platform administration portal is now active. Use this system to monitor organizations, manage users, and configure platform settings.',
                type: 'INFO',
                targetAudience: 'all',
                targetOrgs: [],
                createdBy: superAdmin.id,
                scheduledFor: new Date(),
            },
        });
        console.log('✅ Created welcome announcement');
        console.log('\n🎉 Seeding completed successfully!');
        console.log('\n📋 Default admin accounts created:');
        console.log('   Super Admin: admin@nectar.com / AdminPassword123!');
        console.log('   Admin: support@nectar.com / SupportPassword123!');
        console.log('   Viewer: viewer@nectar.com / ViewerPassword123!');
        console.log('\n⚠️  Please change these default passwords in production!');
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}
main()
    .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map