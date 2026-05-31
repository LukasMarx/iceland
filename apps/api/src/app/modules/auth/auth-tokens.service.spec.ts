import { AuthTokensService } from './auth-tokens.service';

describe('AuthTokensService', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('issues and verifies access tokens', async () => {
    const service = new AuthTokensService();
    const token = await service.issueAccessToken({
      userId: 'user-123',
      email: 'user@example.com',
      provider: 'password',
      displayName: 'User Example',
    });

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      userId: 'user-123',
      email: 'user@example.com',
      provider: 'password',
      displayName: 'User Example',
    });
  });
});