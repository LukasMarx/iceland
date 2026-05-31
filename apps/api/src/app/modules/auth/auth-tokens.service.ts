import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthenticatedUser } from './authenticated-user.interface';

const ISSUER = 'islandhub-api';
const AUDIENCE = 'islandhub-app';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

interface AccessTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  email: string | null;
  provider: string;
  displayName: string | null;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthTokensService {
  async issueAccessToken(user: AuthenticatedUser): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = this.encodeSegment({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encodeSegment({
      iss: ISSUER,
      aud: AUDIENCE,
      sub: user.userId,
      email: user.email,
      provider: user.provider,
      displayName: user.displayName,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    } satisfies AccessTokenPayload);
    const signature = this.sign(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('Invalid access token');
    }

    const signedValue = `${header}.${payload}`;
    const expectedSignature = this.sign(signedValue);
    if (!this.signaturesMatch(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid access token');
    }

    const decodedPayload = this.decodePayload(payload);
    if (
      decodedPayload.iss !== ISSUER ||
      decodedPayload.aud !== AUDIENCE ||
      !decodedPayload.sub ||
      decodedPayload.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      userId: decodedPayload.sub,
      email: decodedPayload.email,
      provider: decodedPayload.provider,
      displayName: decodedPayload.displayName,
    };
  }

  private getSecret() {
    return Buffer.from(process.env.JWT_SECRET ?? 'dev-insecure-change-me', 'utf8');
  }

  private encodeSegment(value: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodePayload(payload: string): AccessTokenPayload {
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private sign(value: string) {
    return createHmac('sha256', this.getSecret()).update(value).digest('base64url');
  }

  private signaturesMatch(signature: string, expectedSignature: string) {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }
}