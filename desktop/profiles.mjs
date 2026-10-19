import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class ProfileStore {
  constructor(directory) {
    this.filename = path.join(directory, 'profiles.json');
    fs.mkdirSync(directory, { recursive: true });
    try {
      this.profiles = JSON.parse(fs.readFileSync(this.filename, 'utf8')).profiles;
      if (!Array.isArray(this.profiles) || this.profiles.some(p => !/^[a-f0-9-]{36}$/.test(p.id) || typeof p.name !== 'string')) throw Error('Invalid profiles');
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Your profile register could not be read. Keep it for recovery; it has not been overwritten.', { cause: error });
      this.profiles = [];
    }
  }
  list() { return this.profiles.map(p => ({ ...p })); }
  get(id) { return this.profiles.find(p => p.id === id); }
  name(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 60) throw Error('Use a profile name of 1–60 characters.');
    return value.trim();
  }
  save() {
    const temporary = this.filename + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify({ version: 1, profiles: this.profiles }, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.filename);
  }
  create(name) {
    const profile = { id: randomUUID(), name: this.name(name), createdAt: new Date().toISOString() };
    this.profiles.push(profile); this.save(); return { ...profile };
  }
  rename(id, name) {
    const profile = this.get(id);
    if (!profile) throw Error('Choose an existing profile.');
    profile.name = this.name(name); this.save(); return { ...profile };
  }
}
