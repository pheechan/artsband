export function buildRedirectUrl(path: string, message?: string, tone?: "success" | "error" | "info") {
  const url = new URL(path, "http://localhost");
  if (message) {
    url.searchParams.set("message", message);
  }
  if (tone) {
    url.searchParams.set("tone", tone);
  }
  return `${url.pathname}${url.search}`;
}
