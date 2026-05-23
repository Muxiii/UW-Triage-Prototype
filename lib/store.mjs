import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function useSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isCloudRuntime() {
  return Boolean(
    process.env.RENDER
    || process.env.VERCEL
    || process.env.NODE_ENV === 'production',
  );
}

async function readJsonFileDb() {
  if (!existsSync(DB_PATH)) return { flows: [], publishedSnapshots: [] };
  return JSON.parse(await readFile(DB_PATH, 'utf8'));
}

async function writeJsonFileDb(db) {
  await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

function createFileStore() {
  return {
    kind: 'file',
    async listFlows({ includeTrash = false } = {}) {
      const db = await readJsonFileDb();
      return (db.flows || []).filter((flow) => (includeTrash ? flow.trashedAt : !flow.trashedAt));
    },
    async getFlow(flowId) {
      const db = await readJsonFileDb();
      return (db.flows || []).find((f) => f.id === flowId) || null;
    },
    async insertFlow(flow) {
      const db = await readJsonFileDb();
      db.flows = db.flows || [];
      db.flows.unshift(flow);
      await writeJsonFileDb(db);
      return flow;
    },
    async updateFlow(flow) {
      const db = await readJsonFileDb();
      const idx = (db.flows || []).findIndex((f) => f.id === flow.id);
      if (idx < 0) return null;
      db.flows[idx] = flow;
      await writeJsonFileDb(db);
      return flow;
    },
    async deleteFlowPermanent(flowId) {
      const db = await readJsonFileDb();
      db.flows = (db.flows || []).filter((f) => f.id !== flowId);
      db.publishedSnapshots = (db.publishedSnapshots || []).filter((s) => s.flowId !== flowId);
      await writeJsonFileDb(db);
    },
    async removeSnapshotsForFlow(flowId) {
      const db = await readJsonFileDb();
      db.publishedSnapshots = (db.publishedSnapshots || []).filter((s) => s.flowId !== flowId);
      await writeJsonFileDb(db);
    },
    async replaceSnapshotForFlow(snapshot) {
      const db = await readJsonFileDb();
      db.publishedSnapshots = (db.publishedSnapshots || []).filter((s) => s.flowId !== snapshot.flowId);
      db.publishedSnapshots.unshift(snapshot);
      await writeJsonFileDb(db);
    },
    async listPublicSnapshots() {
      const db = await readJsonFileDb();
      return (db.publishedSnapshots || []).filter((s) => s.publishScope === 'PUBLIC');
    },
    async getPublicSnapshot(flowId) {
      const db = await readJsonFileDb();
      return (db.publishedSnapshots || []).find((s) => s.flowId === flowId && s.publishScope === 'PUBLIC') || null;
    },
  };
}

function createSupabaseStore() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function listAllFlows() {
    const { data, error } = await supabase
      .from('flows')
      .select('document')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Supabase list flows failed: ${error.message}`);
    return (data || []).map((row) => row.document);
  }

  return {
    kind: 'supabase',
    async listFlows({ includeTrash = false } = {}) {
      const flows = await listAllFlows();
      return flows.filter((flow) => (includeTrash ? flow.trashedAt : !flow.trashedAt));
    },
    async getFlow(flowId) {
      const { data, error } = await supabase.from('flows').select('document').eq('id', flowId).maybeSingle();
      if (error) throw new Error(`Supabase get flow failed: ${error.message}`);
      return data?.document || null;
    },
    async insertFlow(flow) {
      const { error } = await supabase.from('flows').insert({
        id: flow.id,
        document: flow,
        created_at: flow.createdAt,
        updated_at: flow.updatedAt,
      });
      if (error) throw new Error(`Supabase insert flow failed: ${error.message}`);
      return flow;
    },
    async updateFlow(flow) {
      const { data, error } = await supabase
        .from('flows')
        .update({ document: flow, updated_at: flow.updatedAt })
        .eq('id', flow.id)
        .select('id')
        .maybeSingle();
      if (error) throw new Error(`Supabase update flow failed: ${error.message}`);
      if (!data) return null;
      return flow;
    },
    async deleteFlowPermanent(flowId) {
      const { error } = await supabase.from('flows').delete().eq('id', flowId);
      if (error) throw new Error(`Supabase delete flow failed: ${error.message}`);
    },
    async removeSnapshotsForFlow(flowId) {
      const { error } = await supabase.from('published_snapshots').delete().eq('flow_id', flowId);
      if (error) throw new Error(`Supabase delete snapshots failed: ${error.message}`);
    },
    async replaceSnapshotForFlow(snapshot) {
      await this.removeSnapshotsForFlow(snapshot.flowId);
      const { error } = await supabase.from('published_snapshots').insert({
        id: snapshot.id,
        flow_id: snapshot.flowId,
        document: snapshot,
        publish_scope: snapshot.publishScope,
        published_at: snapshot.publishedAt,
      });
      if (error) throw new Error(`Supabase insert snapshot failed: ${error.message}`);
      return snapshot;
    },
    async listPublicSnapshots() {
      const { data, error } = await supabase
        .from('published_snapshots')
        .select('document')
        .eq('publish_scope', 'PUBLIC')
        .order('published_at', { ascending: false });
      if (error) throw new Error(`Supabase list snapshots failed: ${error.message}`);
      return (data || []).map((row) => row.document);
    },
    async getPublicSnapshot(flowId) {
      const { data, error } = await supabase
        .from('published_snapshots')
        .select('document')
        .eq('flow_id', flowId)
        .eq('publish_scope', 'PUBLIC')
        .maybeSingle();
      if (error) throw new Error(`Supabase get snapshot failed: ${error.message}`);
      return data?.document || null;
    },
  };
}

let storeSingleton = null;

export function getStore() {
  if (!storeSingleton) {
    if (isCloudRuntime() && !useSupabase()) {
      throw new Error(
        'Cloud deploy requires Supabase: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render (or host) environment variables. '
        + 'data/db.json is not writable on serverless/read-only filesystems.',
      );
    }
    storeSingleton = useSupabase() ? createSupabaseStore() : createFileStore();
    console.log(`[store] using ${storeSingleton.kind} backend`);
  }
  return storeSingleton;
}

export { useSupabase, isCloudRuntime, DB_PATH, readJsonFileDb };
