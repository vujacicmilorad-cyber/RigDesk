import type { AppRole, Profile } from "@/types/database";

export function canSeeFinancials(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "office";
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return role === "owner";
}

export function canAddTruck(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "office" || role === "sales";
}

export function canWriteCosts(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "office" || role === "mechanic";
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "sales":
      return "Sales rep";
    case "mechanic":
      return "Mechanic";
    case "office":
      return "Office";
  }
}

export function displayName(profile: Profile | null): string {
  return profile?.name ?? "Signed out";
}
