import {
  avatarColor,
  avatarColors,
  roleLabel,
  userInitials,
} from '../user-display';

describe('userInitials', () => {
  it.each([
    ['Maya Thompson', 'MT'],
    ['maya thompson', 'MT'],
    ['Daniel K. Okafor', 'DO'],
    ['Cher', 'C'],
    ['  Ana   Lima  ', 'AL'],
  ])('%s → %s', (name, initials) => {
    expect(userInitials(name)).toBe(initials);
  });

  it('falls back to the email, then "?"', () => {
    expect(userInitials('', 'zoe@example.com')).toBe('Z');
    expect(userInitials(null)).toBe('?');
  });
});

describe('roleLabel', () => {
  it('labels the known roles', () => {
    expect(roleLabel('admin')).toBe('Admin');
    expect(roleLabel('agent')).toBe('Agent');
  });

  it('passes unknown roles through and handles a missing role', () => {
    expect(roleLabel('auditor')).toBe('auditor');
    expect(roleLabel(null)).toBeNull();
  });
});

describe('avatarColor', () => {
  it('has at least 6 distinct colours', () => {
    expect(new Set(avatarColors).size).toBeGreaterThanOrEqual(6);
  });

  it('always gives the same user the same colour, ignoring case', () => {
    expect(avatarColor('Maya.Thompson@example.com')).toBe(
      avatarColor('maya.thompson@example.com'),
    );
  });

  it('only returns palette colours', () => {
    for (let i = 0; i < 100; i++) {
      expect(avatarColors).toContain(avatarColor(`user${i}@example.com`));
    }
  });

  it('spreads users across the palette', () => {
    const used = new Set(
      Array.from({ length: 40 }, (_, i) =>
        avatarColor(`agent${i}@example.com`),
      ),
    );
    expect(used.size).toBe(avatarColors.length);
  });
});
