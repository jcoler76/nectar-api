/*
  Seed a sample ExposedEntity for Auto-REST.
  Usage:
    node server/scripts/seedAutoRestExample.js \
      --org <organizationId> \
      --service <serviceId> \
      --connection <connectionId> \
      --database <dbName> \
      --schema <schemaName> \
      --table <tableName> \
      --pk <primaryKey> \
      [--slug <pathSlug>] [--allowCreate] [--allowUpdate] [--allowDelete]

  Notes: This script assumes Prisma is configured and the DB is migrated.
*/

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

(async function run() {
  try {
    const organizationId = arg('org');
    const serviceId = arg('service');
    const connectionId = arg('connection');
    const database = arg('database');
    const schema = arg('schema', 'public');
    const name = arg('table');
    const primaryKey = arg('pk', 'id');
    const pathSlug = arg('slug');

    if (!organizationId || !serviceId || !connectionId || !database || !name) {
      throw new Error('Missing required args: --org --service --connection --database --table');
    }

    const data = {
      organizationId,
      serviceId,
      connectionId,
      database,
      schema,
      name,
      type: 'TABLE',
      primaryKey,
      allowRead: true,
      allowCreate: flag('allowCreate'),
      allowUpdate: flag('allowUpdate'),
      allowDelete: flag('allowDelete'),
      pathSlug: pathSlug || null,
    };

    const existing = await prisma.exposedEntity.findFirst({
      where: { serviceId, schema, name },
    });
    let result;
    if (existing) {
      result = await prisma.exposedEntity.update({ where: { id: existing.id }, data });
      console.log('Updated ExposedEntity', result.id);
    } else {
      result = await prisma.exposedEntity.create({ data });
      console.log('Created ExposedEntity', result.id);
    }
  } catch (e) {
    console.error('Seed error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
