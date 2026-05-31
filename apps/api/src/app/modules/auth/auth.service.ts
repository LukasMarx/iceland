import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuthenticatedUser } from './authenticated-user.interface';
import { AuthTokensService } from './auth-tokens.service';
import { PasswordHasherService } from './password-hasher.service';
import {
  SocialLoginVerifierService,
  SocialProvider,
  VerifiedSocialIdentity,
} from './social-login-verifier.service';

interface UserRecord {
  id: string;
  email: string | null;
  displayName: string;
  initials: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly authTokens: AuthTokensService,
    private readonly socialLoginVerifier: SocialLoginVerifierService,
  ) {}

  async register(body: { email?: string; password?: string; displayName?: string }) {
    const email = this.normalizeEmail(body.email);
    const password = this.validatePassword(body.password);
    const displayName = this.resolveDisplayName(body.displayName, email);

    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'password',
          providerUserId: email,
        },
      },
    });
    if (existingIdentity) {
      throw new ConflictException('Account already exists');
    }

    const passwordHash = await this.passwordHasher.hash(password);
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      await this.prisma.authIdentity.create({
        data: {
          userId: user.id,
          provider: 'password',
          providerUserId: email,
          email,
          passwordHash,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName,
          initials: this.buildInitials(displayName),
          authIdentities: {
            create: {
              provider: 'password',
              providerUserId: email,
              email,
              passwordHash,
            },
          },
        },
      });
    }

    await this.recordLoginAudit(user.id, { mode: 'password_register' });
    return this.buildAuthResponse(user, 'password');
  }

  async login(body: { email?: string; password?: string }) {
    const email = this.normalizeEmail(body.email);
    const password = this.validatePassword(body.password, { allowShortForLookup: true });

    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'password',
          providerUserId: email,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            initials: true,
          },
        },
      },
    });

    if (!identity?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordHasher.verify(password, identity.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.recordLoginAudit(identity.user.id, { mode: 'password_login' });
    return this.buildAuthResponse(identity.user, 'password');
  }

  async loginWithSocial(body: {
    provider?: SocialProvider;
    idToken?: string;
    displayName?: string;
  }) {
    if (body.provider !== 'google' && body.provider !== 'apple') {
      throw new BadRequestException('provider must be google or apple');
    }

    const identity = await this.socialLoginVerifier.verify(body.provider, body.idToken ?? '');
    const user = await this.resolveSocialUser(identity, body.displayName);

    await this.recordLoginAudit(user.id, { mode: `${body.provider}_login` });
    return this.buildAuthResponse(user, body.provider);
  }

  private async resolveSocialUser(
    verifiedIdentity: VerifiedSocialIdentity,
    fallbackDisplayName?: string,
  ): Promise<UserRecord> {
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: verifiedIdentity.provider,
          providerUserId: verifiedIdentity.subject,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            initials: true,
          },
        },
      },
    });

    if (existingIdentity) {
      if (!existingIdentity.email && verifiedIdentity.email) {
        await this.prisma.authIdentity.update({
          where: { id: existingIdentity.id },
          data: { email: verifiedIdentity.email },
        });
      }

      if (!existingIdentity.user.email && verifiedIdentity.email) {
        await this.prisma.user.update({
          where: { id: existingIdentity.user.id },
          data: { email: verifiedIdentity.email },
        });
        return {
          ...existingIdentity.user,
          email: verifiedIdentity.email,
        };
      }

      return existingIdentity.user;
    }

    const email = verifiedIdentity.email;
    let user = email
      ? await this.prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, displayName: true, initials: true },
        })
      : null;

    if (!user) {
      const displayName = this.resolveDisplayName(fallbackDisplayName ?? verifiedIdentity.displayName, email);
      user = await this.prisma.user.create({
        data: {
          email,
          displayName,
          initials: this.buildInitials(displayName),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          initials: true,
        },
      });
    }

    await this.prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: verifiedIdentity.provider,
        providerUserId: verifiedIdentity.subject,
        email,
      },
    });

    return user;
  }

  private async buildAuthResponse(user: UserRecord, provider: string) {
    const authUser: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      provider,
      displayName: user.displayName,
    };

    return {
      accessToken: await this.authTokens.issueAccessToken(authUser),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        initials: user.initials,
      },
    };
  }

  private normalizeEmail(email?: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new BadRequestException('A valid email is required');
    }

    return normalized;
  }

  private validatePassword(
    password?: string,
    options: { allowShortForLookup?: boolean } = {},
  ): string {
    if (!password) {
      throw new BadRequestException('password is required');
    }
    if (!options.allowShortForLookup && password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters long');
    }

    return password;
  }

  private resolveDisplayName(displayName: string | null | undefined, email: string | null): string {
    const trimmed = displayName?.trim();
    if (trimmed) {
      return trimmed;
    }
    if (email) {
      return email.split('@')[0];
    }

    return 'IslandHub User';
  }

  private buildInitials(displayName: string): string {
    const letters = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return letters || 'IH';
  }

  private async recordLoginAudit(userId: string, metadata: Record<string, string>) {
    await this.prisma.auditEvent.create({
      data: {
        userId,
        action: 'login',
        entityType: 'auth',
        entityId: userId,
        metadata,
      },
    });
  }
}