export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "jisho";
  const q = (url.searchParams.get("q") || url.searchParams.get("keyword") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ error: "Missing query parameter 'q'", data: [], results: [] }), {
      status: 400,
      headers
    });
  }

  const hasJapanese = (str) => /[\u3040-\u30ff\u3400-\u9fff]/.test(str);
  const fetchHeaders = {
    "User-Agent": "NihongoPuente/1.0",
    "Accept": "application/json"
  };

  async function fetchJisho(term) {
    const res = await fetch(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(term)}`,
      { headers: fetchHeaders }
    );
    if (!res.ok) return { data: [] };
    return await res.json();
  }

  async function queryTatoeba(term, transLang) {
    try {
      const v0Url = `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(term)}&trans_filter=limit&trans_to=${transLang}`;
      const res = await fetch(v0Url, { headers: fetchHeaders });
      if (res.ok && (res.headers.get("content-type") || "").includes("json")) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) return data.results;
      }
    } catch (_) {}

    try {
      const v1Url = `https://api.tatoeba.org/unstable/sentences?lang=jpn&q=${encodeURIComponent(term)}&trans:lang=${transLang}&limit=6`;
      const res = await fetch(v1Url, { headers: fetchHeaders });
      if (res.ok && (res.headers.get("content-type") || "").includes("json")) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          return data.data.map((s) => ({
            text: s.text,
            translations: [(s.translations || []).flat().map((t) => ({ lang: t.lang, text: t.text }))]
          }));
        }
      }
    } catch (_) {}

    return [];
  }

  try {
    if (type === "jisho") {
      const data = await fetchJisho(q);
      return new Response(JSON.stringify(data), { status: 200, headers });
    }

    if (type === "tatoeba") {
      const candidates = [];

      if (hasJapanese(q)) {
        candidates.push(q);
      } else {
        const jishoData = await fetchJisho(q);
        const entry = jishoData?.data?.[0];
        const first = entry?.japanese?.[0];
        const usuallyKana = (entry?.senses?.[0]?.tags || []).some((t) =>
          t.toLowerCase().includes("kana alone")
        );

        if (first) {
          if (usuallyKana && first.reading) {
            candidates.push(first.reading);
            if (first.word) candidates.push(first.word);
          } else {
            if (first.word) candidates.push(first.word);
            if (first.reading && first.reading !== first.word) candidates.push(first.reading);
          }
        }
        if (candidates.length === 0) candidates.push(q);
      }

      let results = [];
      let resolvedQuery = candidates[0];

      for (const term of candidates) {
        results = await queryTatoeba(term, "spa");
        if (results.length > 0) { resolvedQuery = term; break; }
        results = await queryTatoeba(term, "eng");
        if (results.length > 0) { resolvedQuery = term; break; }
      }

      return new Response(
        JSON.stringify({ originalQuery: q, resolvedQuery, results }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown lookup type" }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, data: [], results: [] }), {
      status: 200,
      headers
    });
  }
};
