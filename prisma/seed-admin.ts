import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = (await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}

async function main() {
  const prisma = new PrismaClient();

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@islandhub.is';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin12345678';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? 'Admin';

  console.log(`Seeding admin user: ${adminEmail}`);

  const passwordHash = await hashPassword(adminPassword);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin' },
    create: {
      email: adminEmail,
      displayName: adminDisplayName,
      initials: adminDisplayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      role: 'admin',
      authIdentities: {
        create: {
          provider: 'password',
          providerUserId: adminEmail.toLowerCase().trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
        },
      },
    },
  });

  console.log(`Admin user seeded: ${user.id} (${user.email})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});