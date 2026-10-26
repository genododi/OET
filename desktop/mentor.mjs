import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export class LocalMentor {
  constructor(root, logs) {
    this.root = root; this.logs = logs; this.state = 'idle'; this.pending = null; this.child = null;
    this.key = randomBytes(32).toString('hex');
  }
  config() {
    return JSON.parse(fs.readFileSync(path.join(this.root, 'model.json'), 'utf8'));
  }
  status() {
    try {
      const config = this.config();
      const installed = fs.existsSync(path.join(this.root, config.model)) && fs.existsSync(path.join(this.root, config.server));
      return { installed, state: this.state, model: config.label, message: installed ? 'Runs entirely on this Mac. No API key or internet needed.' : 'Local model files are missing from this installation.' };
    } catch { return { installed: false, state: 'unavailable', model: 'Local mentor', message: 'The local model has not been installed.' }; }
  }
  async start() {
    if (this.state === 'ready') return;
    if (this.pending) return this.pending;
    this.pending = this.launch().finally(() => { this.pending = null; });
    return this.pending;
  }
  async launch() {
    if (!this.status().installed) throw Error('The local AI model is not installed. Rebuild the Mac app with the local-ai folder.');
    const config = this.config(); this.state = 'loading';
    this.port = await new Promise((resolve, reject) => {
      const socket = net.createServer(); socket.on('error', reject);
      socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); });
    });
    fs.mkdirSync(this.logs, { recursive: true });
    const log = fs.openSync(path.join(this.logs, 'local-mentor.log'), 'a', 0o600);
    this.child = spawn(path.join(this.root, config.server), ['--model', path.join(this.root, config.model), '--host', '127.0.0.1', '--port', String(this.port), '--api-key', this.key, '--ctx-size', '8192', '--parallel', '1', '--n-gpu-layers', '99', '--threads', '4', '--jinja', '--reasoning', 'on', '--reasoning-budget', '384', '--reasoning-format', 'deepseek', '--no-webui'], { cwd: this.root, stdio: ['ignore', log, log], env: { ...process.env, LLAMA_CACHE: path.join(this.logs, 'llama-cache') } });
    fs.closeSync(log);
    this.child.on('error', () => { this.state = 'error'; });
    this.child.on('exit', () => { if (this.state !== 'idle') this.state = 'error'; this.child = null; });
    for (let i = 0; i < 120; i++) {
      if (this.state === 'error') break;
      try { const response = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(1000) }); if (response.ok) { this.state = 'ready'; return; } } catch { /* Model is still loading. */ }
      await delay(1000);
    }
    this.stop(); throw Error('The local model could not start. Close other heavy apps and try again. See local-mentor.log for details.');
  }
  async reply(request) {
    if (request.method !== 'POST' || (request.headers.get('origin') && request.headers.get('origin') !== 'oet://study')) return new Response(null, { status: 403 });
    try {
      const raw = await request.text();
      if (raw.length > 100_000) throw Error('This conversation is too long. Start a new lesson.');
      const body = JSON.parse(raw);
      if (!Array.isArray(body.messages) || body.messages.length > 24 || body.messages.some(m => !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string')) throw Error('Invalid mentor request.');
      await this.start();
      const response = await fetch(`http://127.0.0.1:${this.port}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` }, body: JSON.stringify({ model: 'local-oet-mentor', messages: body.messages, max_tokens: Math.min(2200, Math.max(100, Number(body.max_tokens) || 1000) + (body.careful === true ? 384 : 0)), temperature: Number.isFinite(body.temperature) ? Math.max(0, Math.min(1, body.temperature)) : 0.4, stream: body.stream === true, reasoning_effort: body.careful === true ? 'medium' : 'none', chat_template_kwargs: { enable_thinking: body.careful === true }, ...(body.json ? { response_format: { type: 'json_object' } } : {}) }), signal: request.signal });
      return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
    } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 503, headers: { 'Content-Type': 'application/json' } }); }
  }
  stop() { this.state = 'idle'; this.child?.kill('SIGTERM'); this.child = null; }
}
