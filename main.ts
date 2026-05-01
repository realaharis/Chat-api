// main.ts

const TARGET_URL = (Deno.env.get("TARGET_URL") || "").replace(/\/$/, "");

Deno.serve(async (req: Request) => {
  if (!TARGET_URL) {
    return new Response(
      JSON.stringify({ error: "TARGET_URL is not configured" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  try {
    const url = new URL(req.url);
    const targetEndpoint = `${TARGET_URL}${url.pathname}${url.search}`;

    const headers = new Headers();

    const skipHeaders = new Set([
      "host",
      "connection",
      "keep-alive",
      "transfer-encoding",
      "upgrade",
      "te",
      "trailer",
      "proxy-connection",
      "proxy-authenticate",
      "proxy-authorization",
    ]);

    for (const [key, value] of req.headers.entries()) {
      const lowerKey = key.toLowerCase();

      if (!skipHeaders.has(lowerKey)) {
        headers.set(key, value);
      }
    }

    const clientIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    if (clientIp) {
      headers.set("x-forwarded-for", clientIp);
    }

    const response = await fetch(targetEndpoint, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD"
        ? req.body
        : undefined,
      redirect: "manual",
    });

    return response;
  } catch (err) {
    console.error("proxy error:", err);

    return new Response(
      JSON.stringify({ error: "Unable to reach target server" }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }
});
