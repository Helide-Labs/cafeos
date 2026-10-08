import { ensureTenantBranch } from "../src/lib/data/repo";

async function main() {
  const result = await ensureTenantBranch({
    tenantName: "My Café",
    branchName: "Main branch",
    location: "Add your location",
  });
  console.log(
    `Seeded tenant ${result.tenantId} and branch ${result.branchId} (no operational demo data).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
