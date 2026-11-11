// Local language API for development and self-hosting:
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run language-api
//   # then in .env: VITE_LANGUAGE_API_URL=http://localhost:8787
//
// It has no authentication of its own: run it locally or behind your own auth
// proxy. For a hosted deployment use the Supabase Edge Function instead.

import { createServer } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_MODEL, handleLanguageRequest } from '../supabase/functions/_shared/language-core.ts';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: rely on the shell environment.
}

const PORT = Number(process.env.LANGUAGE_API_PORT) || 8787;
const MAX_BODY_BYTES = 256 * 1024;
const model = process.env.LANGUAGE_MODEL || DEFAULT_MODEL;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
// Resolves ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
const client = new Anthropic();

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return send(405, { error: 'POST only' });

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return send(413, { error: 'Request too large' });
    chunks.push(chunk);
  }

  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return send(400, { error: 'Invalid JSON' });
  }
  try {
    const started = Date.now();
    const result = await handleLanguageRequest(client, body, model);
    console.log(`${(body as { action?: string }).action ?? '?'} → ${result.status} in ${Date.now() - started} ms`);
    send(result.status, result.body);
  } catch (err) {
    console.error(err);
    send(500, { error: 'Unexpected error' });
  }
});

server.listen(PORT, () => {
  console.log(`Suvarna language API on http://localhost:${PORT} (model ${model})`);
});
