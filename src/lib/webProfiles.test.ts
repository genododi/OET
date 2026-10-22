import { afterEach, describe, expect, it, vi } from 'vitest';
import { canBackUpKey, importProfileBackup, profileStorage } from './webProfiles';

afterEach(() => vi.unstubAllGlobals());

describe('device study profiles', () => {
  it('keeps legacy answers in the default profile and isolates two new learners', () => {
    const raw = window.localStorage;
    raw.setItem('oet-writing-draft', 'Existing letter');
    raw.setItem('preferredProfession', 'medicine');
    raw.setItem('oet-webapp-packs-v1', 'Shared downloads');
    raw.setItem('other-site-setting', 'Untouched');
    const first = profileStorage(raw, 'first');
    const second = profileStorage(raw, 'second');
    expect(first.getItem('oet-writing-draft')).toBeNull();
    first.setItem('oet-writing-draft', 'First letter');
    second.setItem('oet-writing-draft', 'Second letter');
    expect(first['oet-writing-draft']).toBe('First letter');
    expect(second.getItem('oet-writing-draft')).toBe('Second letter');
    expect(profileStorage(raw, 'default').getItem('oet-writing-draft')).toBe('Existing letter');
    expect(first.getItem('preferredProfession')).toBeNull();
    first.setItem('preferredProfession', 'nursing');
    expect(Object.keys(first)).toContain('preferredProfession');
    expect(Object.keys(first).some(key => key.startsWith('oet-webapp-profile-data:'))).toBe(false);
    first.clear();
    expect(first.getItem('oet-writing-draft')).toBeNull();
    expect(second.getItem('oet-writing-draft')).toBe('Second letter');
    expect(raw.getItem('preferredProfession')).toBe('medicine');
    expect(raw.getItem('oet-webapp-packs-v1')).toBe('Shared downloads');
    expect(raw.getItem('other-site-setting')).toBe('Untouched');
    raw.removeItem('other-site-setting');
  });

  it('imports only validated study data into the current profile without overwriting work', () => {
    const storage = profileStorage(window.localStorage, 'restored');
    vi.stubGlobal('localStorage', storage);
    storage.setItem('jahshan-listening-answers', 'My answers');
    expect(importProfileBackup({ data: { 'jahshan-listening-answers': 'Old answers', 'oet-writing-draft': 'Restored letter' } })).toBe(1);
    expect(storage.getItem('jahshan-listening-answers')).toBe('My answers');
    expect(storage.getItem('oet-writing-draft')).toBe('Restored letter');
    expect(() => importProfileBackup({ data: { 'oet-new-answer': 'Must not write', 'oet-anthropic-key': 'Secret' } })).toThrow('unsupported');
    expect(storage.getItem('oet-new-answer')).toBeNull();
    expect(canBackUpKey('oet-anthropic-key')).toBe(false);
    expect(canBackUpKey('oet-api-key')).toBe(false);
    expect(canBackUpKey('oet-webapp-profiles-v1')).toBe(false);
  });
});
