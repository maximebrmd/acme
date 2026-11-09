/**
 * When each account's password was last tried, in epoch milliseconds, within
 * the window `admitAttempt` looks back over.
 */
export type PasswordAttempts = ReadonlyMap<string, readonly number[]>;

/**
 * As often as Better Auth lets anyone try a password through its own routes
 * (signing in, changing the password): three times within 10 seconds.
 */
export const passwordAttemptLimit = { max: 3, windowMillis: 10_000 };

/**
 * Records a try of the account's password at `now`, unless it used up its
 * tries: whether the password may be checked, and the tries still within
 * the window, every account's, so the map never outgrows them.
 */
export const admitAttempt = (
  attempts: PasswordAttempts,
  userId: string,
  now: number
): readonly [boolean, PasswordAttempts] => {
  const recent = new Map(
    [...attempts].flatMap(([id, times]): [string, readonly number[]][] => {
      const kept = times.filter(
        (at) => now - at < passwordAttemptLimit.windowMillis
      );

      return kept.length === 0 ? [] : [[id, kept]];
    })
  );

  const tried = recent.get(userId) ?? [];

  if (tried.length >= passwordAttemptLimit.max) {
    return [false, recent];
  }

  recent.set(userId, [...tried, now]);

  return [true, recent];
};

/** Forgets the account's tries, once its password matched. */
export const forgetAttempts = (
  attempts: PasswordAttempts,
  userId: string
): PasswordAttempts => new Map([...attempts].filter(([id]) => id !== userId));
