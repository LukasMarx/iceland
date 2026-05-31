import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordHasherService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const derivedKey = (await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH)) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, encodedHash] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !encodedHash) {
      return false;
    }

    const derivedKey = (await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH)) as Buffer;
    const storedHash = Buffer.from(encodedHash, 'base64url');

    return storedHash.length === derivedKey.length && timingSafeEqual(storedHash, derivedKey);
  }
}