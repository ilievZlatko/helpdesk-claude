import { UserRole } from '@helpdesk/shared';
import { UserRole as PrismaUserRole } from '../generated/prisma/enums.js';

// The shared enum is what the code uses; the Prisma enum is what the database
// stores. They must list the same values.
describe('UserRole', () => {
  it('matches the Prisma UserRole enum', () => {
    expect(Object.values(UserRole).sort()).toEqual(
      Object.values(PrismaUserRole).sort(),
    );
  });
});
