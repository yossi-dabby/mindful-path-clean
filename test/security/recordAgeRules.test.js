import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGE_GATED_ENTITIES } from '../../base44/functions/accountAccess/recordEntities.js';
import { fileDeletionTranslations } from '../../src/components/i18n/fileDeletionTranslations.js';
const schema = name => JSON.parse(readFileSync(`base44/entities/${name}.jsonc`, 'utf8'));
const valueAt = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
// Test the documented subset of provider predicates. This is a local contract
// test, not evidence that Base44 has deployed/enforced these rules.
function matches(rule, user, record = {}) {
  if (rule === false) return false;
  if (rule === true) return true;
  if (rule.$and) return rule.$and.every(child => matches(child, user, record));
  if (rule.$or) return rule.$or.some(child => matches(child, user, record));
  if (rule.user_condition) return Object.entries(rule.user_condition).every(([key, value]) => valueAt(user, key) === value);
  return Object.entries(rule).every(([key, value]) => valueAt(record, key) === (typeof value === 'string' && value.startsWith('{{user.') ? valueAt(user, value.slice(7, -2)) : value));
}
const adult = { role: 'user', email: 'a@example.test', id: 'a', data: { mp_adult_policy: '2026-11-11', mp_account_deletion_pending: false } };
const own = { created_by: adult.email, data: { user_email: adult.email } };
describe('direct entity age enforcement', () => {
  for (const name of AGE_GATED_ENTITIES) {
    it(`${name} denies every app-user operation without current, unlocked eligibility`, () => {
      for (const role of ['user', 'admin']) {
        for (const data of [{}, { mp_adult_policy: 'true' }, { mp_adult_policy: 'old', mp_account_deletion_pending: false }, { mp_adult_policy: '2026-11-11', mp_account_deletion_pending: true }]) {
          for (const operation of ['create', 'read', 'update', 'delete']) expect(matches(schema(name).rls[operation], { ...adult, role, data }, own)).toBe(false);
        }
      }
    });
  }
  it.each(['ThoughtJournal', 'Conversation', 'CaseFormulation', 'MoodEntry', 'CompanionMemory', 'Goal'])('%s preserves approved ownership isolation in both directions', name => {
    const other = { ...adult, id: 'b', email: 'b@example.test' };
    for (const operation of ['create', 'read', 'update', 'delete']) {
      const rule = schema(name).rls[operation];
      expect(matches(rule, adult, own)).toBe(true);
      expect(matches(rule, other, own)).toBe(false);
      expect(matches(rule, adult, { created_by: other.email })).toBe(false);
      expect(matches(rule, { ...other, role: 'admin' }, own)).toBe(false);
    }
  });
  it('keeps intentionally shared community reads available to eligible adults', () => {
    expect(matches(schema('ForumPost').rls.read, adult, { created_by: 'b@example.test' })).toBe(true);
    expect(matches(schema('ForumPost').rls.update, adult, { created_by: 'b@example.test' })).toBe(false);
  });
  it('locks the trusted fields even for first set and platform app admins', () => {
    for (const field of ['mp_adult_policy', 'mp_account_deletion_pending']) {
      const rule = schema('User').properties[field].rls.update;
      for (const role of ['user', 'admin']) expect(matches(rule, { role })).toBe(false);
      expect(matches(rule, { collaborator_role: 'editor' })).toBe(true);
    }
  });
  it('keeps the deletion queue service-only, including create/update', () => {
    for (const role of ['user', 'admin']) for (const rule of Object.values(schema('FileDeletionRequest').rls)) expect(matches(rule, { ...adult, role })).toBe(false);
  });
  it('supplies the same nonempty workflow copy in all seven languages', () => {
    const keys = Object.keys(fileDeletionTranslations.en).sort();
    for (const language of ['en','he','es','fr','de','it','pt']) {
      expect(Object.keys(fileDeletionTranslations[language]).sort()).toEqual(keys);
      for (const text of Object.values(fileDeletionTranslations[language])) expect(text.length).toBeGreaterThan(0);
    }
  });
});
