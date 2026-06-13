/**
 * Smart Farm AI — Sovereign RAG Worker (Cloudflare Workers AI + Vectorize)
 * ========================================================================
 * Always-on, serverless RAG. Replaces the local ChromaDB/Ollama dependency.
 *
 *   POST /ingest   (Bearer INGEST_TOKEN)  body: { docs: [{id, text, metadata}] }
 *   POST /query    body: { query, top_k?, species? }  → { matches: [{text, score, metadata}] }
 *   POST /chat     body: { query, species?, lang? }    → { answer, sources }
 *   GET  /health
 *
 * Models:
 *   embeddings : @cf/baai/bge-m3            (1024-d, multilingual FR/AR)
 *   generation : @cf/meta/llama-3.1-8b-instruct
 */

const EMBED_MODEL = "@cf/baai/bge-m3";
const LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function embed(env, texts) {
  const { data } = await env.AI.run(EMBED_MODEL, { text: texts });
  return data; // array of vectors
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
      });
    }

    if (path === "/health") return json({ status: "ok", model: EMBED_MODEL });

    // ── Ingest (protected) ────────────────────────────────────────────────
    if (path === "/ingest" && request.method === "POST") {
      const auth = request.headers.get("Authorization") || "";
      if (!env.INGEST_TOKEN || auth !== `Bearer ${env.INGEST_TOKEN}`) {
        return json({ error: "unauthorized" }, 401);
      }
      const { docs = [] } = await request.json();
      if (!docs.length) return json({ error: "no docs" }, 400);

      const vectors = await embed(env, docs.map((d) => d.text));
      const rows = docs.map((d, i) => ({
        id: String(d.id),
        values: vectors[i],
        metadata: { text: d.text, ...(d.metadata || {}) },
      }));
      const res = await env.VECTORIZE.upsert(rows);
      return json({ ingested: rows.length, mutation: res });
    }

    // ── Query (semantic search) ───────────────────────────────────────────
    if (path === "/query" && request.method === "POST") {
      const { query, top_k = 3, species } = await request.json();
      if (!query) return json({ error: "query required" }, 400);
      const [vec] = await embed(env, [query]);
      const filter = species ? { species } : undefined;
      const result = await env.VECTORIZE.query(vec, {
        topK: top_k,
        returnMetadata: "all",
        ...(filter ? { filter } : {}),
      });
      const matches = (result.matches || []).map((m) => ({
        text: m.metadata?.text || "",
        score: m.score,
        metadata: m.metadata,
      }));
      return json({ matches });
    }

    // ── Chat (RAG + LLM) ──────────────────────────────────────────────────
    if (path === "/chat" && request.method === "POST") {
      const { query, species, lang = "fr" } = await request.json();
      if (!query) return json({ error: "query required" }, 400);
      const [vec] = await embed(env, [query]);
      const result = await env.VECTORIZE.query(vec, { topK: 3, returnMetadata: "all" });
      const context = (result.matches || []).map((m) => m.metadata?.text).filter(Boolean).join("\n---\n");

      const sys = `Tu es PlantBot, un assistant agricole expert pour la Tunisie. `
        + `Réponds en ${lang === "ar" ? "arabe/derja" : "français"}, de façon concise et pratique. `
        + `Appuie-toi STRICTEMENT sur le contexte fourni. Si le contexte ne couvre pas la question, dis-le.`;
      const ai = await env.AI.run(LLM_MODEL, {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Contexte:\n${context}\n\nQuestion: ${query}` },
        ],
      });
      return json({ answer: ai.response, sources: (result.matches || []).map((m) => m.metadata?.topic).filter(Boolean) });
    }

    return json({ error: "not found", routes: ["/health", "/ingest", "/query", "/chat"] }, 404);
  },
};
