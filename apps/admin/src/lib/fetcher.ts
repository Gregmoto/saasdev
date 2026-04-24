export const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`${r.status}: ${text}`);
    }
    return r.json();
  });
