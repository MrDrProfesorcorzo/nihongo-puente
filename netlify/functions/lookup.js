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

  try {
    let targetUrl = "";

    if (type === "jisho") {
      targetUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`;
    } else if (type === "tatoeba") {
      targetUrl = `https://tatoeba.org/en/api_v0/search?from=jpn&query=${encodeURIComponent(q)}&trans_filter=limit&trans_to=spa`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown lookup type" }), {
        status: 400,
        headers
      });
    }

    const upstream = await fetch(targetUrl, {
      headers: { "User-Agent": "NihongoPuente/1.0" }
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: upstream.status, headers }
      );
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers
    });
  }
};