import { getDb } from "@/lib/firebase";

export function tenantRef(tenantId: string) {
  return getDb().collection("tenants").doc(tenantId);
}

export function branchRef(tenantId: string, branchId: string) {
  return tenantRef(tenantId).collection("branches").doc(branchId);
}

export function branchCollection(tenantId: string, branchId: string, name: string) {
  return branchRef(tenantId, branchId).collection(name);
}

export function countersRef(tenantId: string, branchId: string) {
  return branchRef(tenantId, branchId).collection("meta").doc("counters");
}

export function settingsRef(tenantId: string, branchId: string) {
  return branchRef(tenantId, branchId).collection("meta").doc("settings");
}
