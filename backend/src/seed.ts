import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';
import { AuthService } from './services/auth.service';
import logger from './utils/logger';

async function seed() {
  logger.info('Seeding database...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@designertracker.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await AuthService.hashPassword('Admin@123456');

    await prisma.user.create({
      data: {
        email: 'admin@designertracker.com',
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        timezone: 'UTC',
        max_capacity: 0,
      },
    });

    logger.info('Super admin created: admin@designertracker.com / Admin@123456');
  } else {
    logger.info('Super admin already exists, skipping...');
  }

  // Global work schedule
  const globalSchedule = await prisma.workSchedule.findFirst({
    where: { user_id: null },
  });

  if (!globalSchedule) {
    await prisma.workSchedule.create({
      data: {
        user_id: null,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        work_start_time: '09:00',
        work_end_time: '18:00',
      },
    });
    logger.info('Global work schedule created');
  }

  logger.info('Seeding complete!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  logger.error('Seed error', { error: e });
  process.exit(1);
});
