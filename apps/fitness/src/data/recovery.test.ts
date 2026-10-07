import { describe, expect, it } from "vitest";
import { recoveryCredentials } from "./recovery";
import { cloudUrl } from "./cloudConfig";

describe("password recovery links", () => {
  it("accepts the project's unconsumed recovery email link", () => {
    expect(recoveryCredentials(`${cloudUrl}/auth/v1/verify?type=recovery&token=test-hash`)).toEqual({ kind: "hash", token_hash: "test-hash" });
  });
  it("accepts a recovery session redirected to localhost", () => {
    expect(recoveryCredentials("http://localhost:3000/#type=recovery&access_token=test-access&refresh_token=test-refresh")).toEqual({ kind: "session", access_token: "test-access", refresh_token: "test-refresh" });
  });
  it("rejects other projects, unrelated sign-in links, and missing credentials", () => {
    for (const link of ["https://other.supabase.co/auth/v1/verify?type=recovery&token=test", `${cloudUrl}/auth/v1/verify?type=signup&token=test`, "https://example.com/#type=recovery&access_token=test&refresh_token=test", "http://localhost:3000/#type=recovery"]) {
      expect(() => recoveryCredentials(link)).toThrow();
    }
  });
});
