import { describe, it, expect } from 'vitest';
import { createChatDraftSession } from '../../src/lib/chatDraftSession.js';

describe('text drafts within an authenticated session', () => {
  it('restores the active conversation and keeps each draft separate', () => {
    const store = createChatDraftSession();
    store.setOwner('a');
    const firstMount = store.forUser('a');
    firstMount.write(null, 'not yet in a conversation');
    firstMount.write('one', 'first draft');
    firstMount.write('two', 'second draft');
    firstMount.select('two');
    const remount = store.forUser('a');
    expect(remount.active()).toBe('two');
    expect(remount.read('two')).toBe('second draft');
    expect(remount.read('one')).toBe('first draft');
    expect(remount.read(null)).toBe('not yet in a conversation');
  });
  it('does not resurrect a sent or discarded draft', () => {
    const store = createChatDraftSession(); store.setOwner('a');
    const session = store.forUser('a');
    session.write('one', 'submitted'); session.write('one', '');
    expect(store.forUser('a').read('one')).toBe('');
    session.write('two', 'hidden conversation'); session.select('two'); session.forget('two');
    expect(session.read('two')).toBe(''); expect(session.active()).toBeNull();
  });
  it('isolates accounts and rejects late writes from the previous account', () => {
    const store = createChatDraftSession(); store.setOwner('a');
    const old = store.forUser('a'); old.write('one', 'private A');
    store.setOwner('b'); old.write('one', 'late A'); old.select('one');
    expect(store.forUser('b').read('one')).toBe('');
    expect(store.forUser('b').active()).toBeNull();
    expect(store.forUser('a').read('one')).toBe('');
    store.setOwner('a'); expect(store.forUser('a').read('one')).toBe('');
  });
  it('clears on logout and rejects stale writes after the same user signs back in', () => {
    const store = createChatDraftSession(); store.setOwner('a');
    const old = store.forUser('a'); old.write(null, 'private');
    store.clear(); store.setOwner('a'); old.write(null, 'late completion');
    expect(store.forUser('a').read(null)).toBe('');
  });
  it('keeps drafts during successful reauthentication of the same account', () => {
    const store = createChatDraftSession(); store.setOwner('a');
    store.forUser('a').write('one', 'still editing'); store.setOwner('a');
    expect(store.forUser('a').read('one')).toBe('still editing');
  });
  it('never retains anonymous text', () => {
    const store = createChatDraftSession();
    store.forUser(null).write(null, 'anonymous'); store.setOwner('a');
    expect(store.forUser('a').read(null)).toBe('');
  });
});
