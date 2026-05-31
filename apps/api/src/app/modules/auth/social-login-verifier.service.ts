import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { JWTPayload } from 'jose';

let joseModulePromise: Promise<typeof import('jose')> | undefined;

function loadJose() {
  joseModulePromise ??= import('jose');
  return joseModulePromise;
}

export type SocialProvider = 'google' | 'apple';

export interface VerifiedSocialIdentity {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
}

@Injectable()
export class SocialLoginVerifierService {
  async verify(provider: SocialProvider, idToken: string): Promise<VerifiedSocialIdentity> {
    if (!idToken?.trim()) {
      throw new BadRequestException('idToken is required');
    }

    switch (provider) {
      case 'google':
        return this.verifyGoogle(idToken);
      case 'apple':
        return this.verifyApple(idToken);
      default:
        throw new BadRequestException('Unsupported social provider');
    }
  }

  private async verifyGoogle(idToken: string): Promise<VerifiedSocialIdentity> {
    const { createRemoteJWKSet, jwtVerify } = await loadJose();
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
    }

    const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience,
    });

    return this.toVerifiedIdentity('google', payload);
  }

  private async verifyApple(idToken: string): Promise<VerifiedSocialIdentity> {
    const { createRemoteJWKSet, jwtVerify } = await loadJose();
    const audience = process.env.APPLE_CLIENT_ID;
    if (!audience) {
      throw new BadRequestException('APPLE_CLIENT_ID is not configured');
    }

    const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const { payload } = await jwtVerify(idToken, appleJwks, {
      issuer: 'https://appleid.apple.com',
      audience,
    });

    return this.toVerifiedIdentity('apple', payload);
  }

  private toVerifiedIdentity(provider: SocialProvider, payload: JWTPayload): VerifiedSocialIdentity {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid social identity token');
    }

    return {
      provider,
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      displayName: typeof payload.name === 'string' ? payload.name : null,
    };
  }
}