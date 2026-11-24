import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-sync-pin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const expectedPin = process.env.SYNC_PIN;
  const providedPin = req.headers.get("x-sync-pin");

  if (!expectedPin || providedPin !== expectedPin) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing SYNC_PIN" }),
      { status: 401, headers }
    );
  }

  const store = getStore("nihongo-puente-progress");

  try {
    if (req.method === "GET") {
      const data = await store.get("profile", { type: "json" });
      return new Response(JSON.stringify(data || {}), { status: 200, headers });
    }

    if (req.method === "POST") {
      const body = await req.json();
      await store.setJSON("profile", {
        ...body,
        lastSyncedAt: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ ok: true, lastSyncedAt: new Date().toISOString() }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers
    });
  }
};