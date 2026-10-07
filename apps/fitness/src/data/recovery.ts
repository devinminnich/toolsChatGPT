import { cloudUrl } from "./cloudConfig";

// Read credentials locally; never navigate to or fetch a pasted URL.
export function recoveryCredentials(link: string) {
  const url = new URL(link.trim());
  const params = new URLSearchParams(url.hash.slice(1));
  if (url.origin === cloudUrl && url.pathname === "/auth/v1/verify" && url.searchParams.get("type") === "recovery") {
    const token_hash = url.searchParams.get("token") || url.searchParams.get("token_hash");
    if (token_hash) return { kind: "hash" as const, token_hash };
  }
  const local = url.hostname === "localhost" && (url.protocol === "http:" || url.protocol === "https:");
  const app = url.origin === "https://devinminnich.github.io" && url.pathname === "/toolsChatGPT/fitness/";
  if ((local || app) && params.get("type") === "recovery") {
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) return { kind: "session" as const, access_token, refresh_token };
  }
  throw new Error("Paste the password reset link from your email, or the full localhost address after opening it.");
}
