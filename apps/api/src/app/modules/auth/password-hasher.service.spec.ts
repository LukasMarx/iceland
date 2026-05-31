import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('hashes and verifies a password', async () => {
    const passwordHash = await service.hash('Sup3rSafe!');

    await expect(service.verify('Sup3rSafe!', passwordHash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', passwordHash)).resolves.toBe(false);
  });
});