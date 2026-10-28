import { describe, expect, it } from "vitest";
import { isAllowedAdminAccount } from "./isAllowedAdminAccount";

describe("isAllowedAdminAccount", () => {
  describe("fresh sign-in (hd claim)", () => {
    it("allows the acmutd.co Workspace", () => {
      expect(isAllowedAdminAccount({ kind: "signIn", hd: "acmutd.co" })).toBe(true);
    });

    it("rejects a personal Gmail account, which has no hd", () => {
      expect(isAllowedAdminAccount({ kind: "signIn", hd: undefined })).toBe(false);
    });

    it("rejects another Workspace domain", () => {
      expect(isAllowedAdminAccount({ kind: "signIn", hd: "utdallas.edu" })).toBe(false);
    });

    it("requires an exact match", () => {
      expect(isAllowedAdminAccount({ kind: "signIn", hd: "ACMUTD.CO" })).toBe(false);
      expect(isAllowedAdminAccount({ kind: "signIn", hd: "sub.acmutd.co" })).toBe(false);
    });
  });

  describe("restored session (email)", () => {
    it("allows an @acmutd.co email", () => {
      expect(isAllowedAdminAccount({ kind: "restored", email: "officer@acmutd.co" })).toBe(true);
    });

    it("rejects other domains and look-alikes", () => {
      expect(isAllowedAdminAccount({ kind: "restored", email: "someone@gmail.com" })).toBe(false);
      expect(isAllowedAdminAccount({ kind: "restored", email: "someone@notacmutd.co" })).toBe(false);
      expect(isAllowedAdminAccount({ kind: "restored", email: "someone@acmutd.co.evil.com" })).toBe(false);
    });

    it("rejects a user with no email", () => {
      expect(isAllowedAdminAccount({ kind: "restored", email: null })).toBe(false);
    });
  });
});
