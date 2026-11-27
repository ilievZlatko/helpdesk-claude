import { signInSchema } from './auth.js';

describe('signInSchema', () => {
  it('accepts an email and a password', () => {
    const input = { email: 'maya.thompson@example.com', password: 'secret' };
    expect(signInSchema.parse(input)).toEqual(input);
  });

  it('rejects an invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'secret',
    });
    expect(result.error?.issues[0]?.message).toBe(
      'Enter a valid email address',
    );
  });

  it('rejects an empty password', () => {
    const result = signInSchema.safeParse({
      email: 'maya.thompson@example.com',
      password: '',
    });
    expect(result.error?.issues[0]?.message).toBe('Enter your password');
  });
});
