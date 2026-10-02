import { describe, expect, it } from "vitest";
import { can, canAssignRole, canManageDealer, canManageListing, canSuspendUser, canViewListing, isPubliclyVisible, type Actor } from "@/server/auth/policies";

const actor = (role: Actor["role"], id: string = role, dealerId: string | null = null): Actor => ({ id, role, dealerId });
const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

describe("permissions", () => {
  it("grants staff permissions by level", () => {
    expect(can(actor("USER"), "admin.access")).toBe(false);
    expect(can(actor("DEALER"), "admin.access")).toBe(false);
    expect(can(actor("MODERATOR"), "listings.moderate")).toBe(true);
    expect(can(actor("MODERATOR"), "payments.view")).toBe(false);
    expect(can(actor("ADMIN"), "users.changeRole")).toBe(true);
    expect(can(actor("ADMIN"), "settings.manage")).toBe(false);
    expect(can(actor("SUPER_ADMIN"), "settings.manage")).toBe(true);
    expect(can(null, "admin.access")).toBe(false);
  });
});

describe("listing ownership", () => {
  const listing = { sellerId: "seller", dealerId: "dealer-1" };

  it("lets the seller and members of the dealer manage it", () => {
    expect(canManageListing(actor("USER", "seller"), listing)).toBe(true);
    expect(canManageListing(actor("DEALER", "colleague", "dealer-1"), listing)).toBe(true);
    expect(canManageListing(actor("DEALER", "other", "dealer-2"), listing)).toBe(false);
    expect(canManageListing(actor("USER", "stranger"), listing)).toBe(false);
    expect(canManageListing(actor("ADMIN", "admin"), listing)).toBe(false);
  });

  it("hides inactive listings from the public but not from owners and moderators", () => {
    const paused = { ...listing, status: "PAUSED", expiresAt: future, deletedAt: null };
    expect(canViewListing(null, paused)).toBe(false);
    expect(canViewListing(actor("USER", "seller"), paused)).toBe(true);
    expect(canViewListing(actor("MODERATOR", "mod"), paused)).toBe(true);
    expect(canViewListing(null, { ...paused, status: "SOLD" })).toBe(true);
  });

  it("treats expired active listings as not public", () => {
    expect(isPubliclyVisible({ status: "ACTIVE", expiresAt: future, deletedAt: null })).toBe(true);
    expect(isPubliclyVisible({ status: "ACTIVE", expiresAt: past, deletedAt: null })).toBe(false);
    expect(isPubliclyVisible({ status: "ACTIVE", expiresAt: future, deletedAt: new Date() })).toBe(false);
  });
});

describe("role management", () => {
  it("lets admins manage regular users and moderators only", () => {
    const admin = actor("ADMIN", "admin");
    expect(canAssignRole(admin, { id: "u", role: "USER" }, "MODERATOR")).toBe(true);
    expect(canAssignRole(admin, { id: "u", role: "USER" }, "ADMIN")).toBe(false);
    expect(canAssignRole(admin, { id: "a2", role: "ADMIN" }, "USER")).toBe(false);
    expect(canAssignRole(admin, { id: "admin", role: "ADMIN" }, "USER")).toBe(false);
  });

  it("lets super admins grant admin roles but not change their own", () => {
    const root = actor("SUPER_ADMIN", "root");
    expect(canAssignRole(root, { id: "a", role: "ADMIN" }, "SUPER_ADMIN")).toBe(true);
    expect(canAssignRole(root, { id: "root", role: "SUPER_ADMIN" }, "USER")).toBe(false);
    expect(canAssignRole(actor("MODERATOR"), { id: "u", role: "USER" }, "DEALER")).toBe(false);
  });

  it("only suspends lower-ranked accounts", () => {
    expect(canSuspendUser(actor("ADMIN", "admin"), { id: "u", role: "USER" })).toBe(true);
    expect(canSuspendUser(actor("ADMIN", "admin"), { id: "a2", role: "ADMIN" })).toBe(false);
    expect(canSuspendUser(actor("MODERATOR", "m"), { id: "u", role: "USER" })).toBe(false);
  });

  it("lets dealer owners manage only their own dealer", () => {
    expect(canManageDealer(actor("DEALER", "d", "dealer-1"), "dealer-1", "OWNER")).toBe(true);
    expect(canManageDealer(actor("DEALER", "d", "dealer-1"), "dealer-1", "MEMBER")).toBe(false);
    expect(canManageDealer(actor("DEALER", "d", "dealer-1"), "dealer-2", "OWNER")).toBe(false);
    expect(canManageDealer(actor("ADMIN"), "dealer-2")).toBe(true);
  });
});
