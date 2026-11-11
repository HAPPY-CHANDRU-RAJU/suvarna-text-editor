// Supabase Edge Function: POST /functions/v1/language
//
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy language
//
// Only signed-in users may call it, so the API key can't be used anonymously.

import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_MODEL, handleLanguageRequest } from '../_shared/language-core.ts';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const model = Deno.env.get('LANGUAGE_MODEL') || DEFAULT_MODEL;
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';

const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization');
  if (!auth) return false;
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  if (!(await isSignedIn(req))) return json(401, { error: 'Sign in to use the language service' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  try {
    const result = await handleLanguageRequest(client, body, model);
    return json(result.status, result.body);
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Unexpected error' });
  }
});
