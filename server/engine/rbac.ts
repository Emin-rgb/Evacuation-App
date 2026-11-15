export type Role = "viewer" | "dispatcher";
export type Action = "dashboard.read" | "alert.decide" | "simulate" | "road.write" | "shelter.write";

const PERMISSIONS: Record<Role, readonly Action[]> = {
  viewer: ["dashboard.read"],
  dispatcher: ["dashboard.read", "alert.decide", "simulate", "road.write", "shelter.write"],
};

export function isRole(value: string): value is Role {
  return value === "viewer" || value === "dispatcher";
}

export function canDo(role: Role, action: Action): boolean {
  return PERMISSIONS[role].includes(action);
}
