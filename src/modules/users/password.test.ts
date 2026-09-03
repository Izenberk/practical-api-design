import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword } from './password.js';

const plain = 'hunter2hunter2';

describe('password', () => {
  it('produces a hash that does not contain the plaintext', async () => {
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash).not.toContain(plain);
  });

  it('accepts the correct password', async() => {
    const hash = await hashPassword(plain);

    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword(plain);

    await expect(verifyPassword('wrongwrongwrong', hash)).resolves.toBe(false);
  });

  it('salts, so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([
      hashPassword(plain),
      hashPassword(plain),
    ]);

    expect(first).not.toBe(second);
    await expect(verifyPassword(plain, first!)).resolves.toBe(true);
    await expect(verifyPassword(plain, second!)).resolves.toBe(true);
  });
});