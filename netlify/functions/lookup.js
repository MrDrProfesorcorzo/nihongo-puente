export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "jisho";
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ error: "Missing query parameter 'q'" }), {
      status: 400,
      headers
    });
  }

  const hasJapanese = (str) => /[\u3040-\u30ff\u3400-\u9fff]/.test(str);

  try {
    if (type === "jisho") {
      const upstream = await fetch(
        `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`,
        { headers: { "User-Agent": "NihongoPuente/1.0" } }
      );
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: `Jisho returned ${upstream.status}` }), {
          status: upstream.status,
          headers
        });
      }
      const data = await upstream.json();
      return new Response(JSON.stringify(data), { status: 200, headers });
    }

    if (type === "tatoeba") {
      let jpQuery = q;

      // If user typed English or romaji, resolve to Japanese via Jisho first
      if (!hasJapanese(q)) {
        const jishoRes = await fetch(
          `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`,
          { headers: { "User-Agent": "NihongoPuente/1.0" } }
        );
        if (jishoRes.ok) {
          const jishoData = await jishoRes.json();
          const first = jishoData?.data?.[0]?.japanese?.[0];
          if (first) {
            jpQuery = first.word || first.reading || q;
          }
        }
      }

      // 1st attempt: Japanese sentences with Spanish translations
      let tatRes = await fetch(
        `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(jpQuery)}&trans_to=spa&sort=relevance`,
        { headers: { "User-Agent": "NihongoPuente/1.0" } }
      );
      let tatData = tatRes.ok ? await tatRes.json() : { results: [] };

      // 2nd attempt: fallback to English translations if no Spanish matches
      if (!tatData.results || tatData.results.length === 0) {
        tatRes = await fetch(
          `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(jpQuery)}&trans_to=eng&sort=relevance`,
          { headers: { "User-Agent": "NihongoPuente/1.0" } }
        );
        tatData = tatRes.ok ? await tatRes.json() : { results: [] };
      }

      return new Response(
        JSON.stringify({
          originalQuery: q,
          resolvedQuery: jpQuery,
          results: tatData.results || []
        }),
        { status: 200, headers }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown lookup type" }), {
      status: 400,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers
    });
  }
};
