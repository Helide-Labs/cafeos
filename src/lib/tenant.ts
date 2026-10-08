export function getDefaultTenantId() {
  return process.env.DEFAULT_TENANT_ID ?? "tenant_default";
}

export function getDefaultBranchId() {
  return process.env.DEFAULT_BRANCH_ID ?? "branch_default";
}
