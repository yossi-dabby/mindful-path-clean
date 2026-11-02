import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shouldRecoverAuthOnOnline } from '../../src/lib/authRecovery.js';

const read = (path) => readFileSync(path, 'utf8');

describe('authentication recovery after connectivity returns', () => {
  it('retries startup authentication after network and timeout failures', () => {
    expect(shouldRecoverAuthOnOnline({ type: 'unknown' })).toBe(true);
    expect(shouldRecoverAuthOnOnline({ type: 'auth_timeout' })).toBe(true);
  });

  it('does not loop for access or invitation failures', () => {
    expect(shouldRecoverAuthOnOnline({ type: 'user_not_registered' })).toBe(false);
    expect(shouldRecoverAuthOnOnline(null)).toBe(false);
  });

  it('subscribes only while a recoverable startup error is visible', () => {
    const source = read('src/lib/AuthContext.jsx');
    expect(source).toContain("window.addEventListener('online', retryWhenOnline)");
    expect(source).toContain("window.removeEventListener('online', retryWhenOnline)");
    expect(source).toContain('shouldRecoverAuthOnOnline(authError)');
  });
});

describe('authentication surface contracts', () => {
  it('uses translation keys throughout both password recovery pages', () => {
    const forgot = read('src/pages/ForgotPassword.jsx');
    const reset = read('src/pages/ResetPassword.jsx');

    for (const key of ['title', 'subtitle', 'back', 'sent', 'email', 'sending', 'submit']) {
      expect(forgot, key).toContain(`auth.forgot.${key}`);
    }
    for (const key of [
      'invalid_title',
      'invalid_subtitle',
      'request_new',
      'invalid_body',
      'title',
      'subtitle',
      'password',
      'confirm',
      'password_mismatch',
      'failed',
      'resetting',
      'submit',
    ]) {
      expect(reset, key).toContain(`auth.reset.${key}`);
    }
  });

  it('offers only OAuth providers supported by the Base44 SDK', () => {
    const source = read('src/components/SocialAuthButtons.jsx');
    expect(source).toContain('{ id: "microsoft"');
    expect(source).toContain('{ id: "facebook"');
    expect(source).toContain('handle("google")');
    expect(source).not.toContain('{ id: "apple"');
    expect(source).not.toContain('function AppleIcon');
  });
});
