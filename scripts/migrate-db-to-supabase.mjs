/**
 * One-time import: data/db.json -> Supabase tables.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (or --env-file=.env).
 */
import { createClient } from '@supabase/supabase-js';
import { readJsonFileDb } from '../lib/store.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const db = await readJsonFileDb();
const flows = db.flows || [];
const snapshots = db.publishedSnapshots || [];

console.log(`Importing ${flows.length} flows and ${snapshots.length} snapshots...`);

if (flows.length) {
  const rows = flows.map((flow) => ({
    id: flow.id,
    document: flow,
    created_at: flow.createdAt || new Date().toISOString(),
    updated_at: flow.updatedAt || flow.createdAt || new Date().toISOString(),
  }));
  const { error } = await supabase.from('flows').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`flows upsert: ${error.message}`);
}

if (snapshots.length) {
  const rows = snapshots.map((snapshot) => ({
    id: snapshot.id,
    flow_id: snapshot.flowId,
    document: snapshot,
    publish_scope: snapshot.publishScope,
    published_at: snapshot.publishedAt || new Date().toISOString(),
  }));
  const { error } = await supabase.from('published_snapshots').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`snapshots upsert: ${error.message}`);
}

console.log('Done. Restart the server with Supabase env vars to use the remote store.');
