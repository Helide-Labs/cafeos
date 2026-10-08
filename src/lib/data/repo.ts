import { getDataBackend } from "@/lib/data/backend";
import * as firestoreRepo from "@/lib/firestore/repo";
import * as memoryRepo from "@/lib/data/memory-repo";

function active() {
  return getDataBackend() === "memory" ? memoryRepo : firestoreRepo;
}

export async function ensureTenantBranch(...args: Parameters<typeof memoryRepo.ensureTenantBranch>) {
  return active().ensureTenantBranch(...args);
}

export async function getBootstrap(...args: Parameters<typeof memoryRepo.getBootstrap>) {
  return active().getBootstrap(...args);
}

export async function listProducts(...args: Parameters<typeof memoryRepo.listProducts>) {
  return active().listProducts(...args);
}

export async function createProduct(...args: Parameters<typeof memoryRepo.createProduct>) {
  return active().createProduct(...args);
}

export async function patchProduct(...args: Parameters<typeof memoryRepo.patchProduct>) {
  return active().patchProduct(...args);
}

export async function deleteProduct(...args: Parameters<typeof memoryRepo.deleteProduct>) {
  return active().deleteProduct(...args);
}

export async function listOrders(...args: Parameters<typeof memoryRepo.listOrders>) {
  return active().listOrders(...args);
}

export async function createOrder(...args: Parameters<typeof memoryRepo.createOrder>) {
  return active().createOrder(...args);
}

export async function advanceOrder(...args: Parameters<typeof memoryRepo.advanceOrder>) {
  return active().advanceOrder(...args);
}

export async function refundOrder(...args: Parameters<typeof memoryRepo.refundOrder>) {
  return active().refundOrder(...args);
}

export async function listStock(...args: Parameters<typeof memoryRepo.listStock>) {
  return active().listStock(...args);
}

export async function createStock(...args: Parameters<typeof memoryRepo.createStock>) {
  return active().createStock(...args);
}

export async function patchStock(...args: Parameters<typeof memoryRepo.patchStock>) {
  return active().patchStock(...args);
}

export async function deleteStock(...args: Parameters<typeof memoryRepo.deleteStock>) {
  return active().deleteStock(...args);
}

export async function adjustStock(...args: Parameters<typeof memoryRepo.adjustStock>) {
  return active().adjustStock(...args);
}

export async function recordWaste(...args: Parameters<typeof memoryRepo.recordWaste>) {
  return active().recordWaste(...args);
}

export async function listWaste(...args: Parameters<typeof memoryRepo.listWaste>) {
  return active().listWaste(...args);
}

export async function listLedger(...args: Parameters<typeof memoryRepo.listLedger>) {
  return active().listLedger(...args);
}

export async function listPurchaseOrders(...args: Parameters<typeof memoryRepo.listPurchaseOrders>) {
  return active().listPurchaseOrders(...args);
}

export async function createPurchaseOrder(...args: Parameters<typeof memoryRepo.createPurchaseOrder>) {
  return active().createPurchaseOrder(...args);
}

export async function patchPurchaseOrder(...args: Parameters<typeof memoryRepo.patchPurchaseOrder>) {
  return active().patchPurchaseOrder(...args);
}

export async function listCustomers(...args: Parameters<typeof memoryRepo.listCustomers>) {
  return active().listCustomers(...args);
}

export async function createCustomer(...args: Parameters<typeof memoryRepo.createCustomer>) {
  return active().createCustomer(...args);
}

export async function patchCustomer(...args: Parameters<typeof memoryRepo.patchCustomer>) {
  return active().patchCustomer(...args);
}

export async function deleteCustomer(...args: Parameters<typeof memoryRepo.deleteCustomer>) {
  return active().deleteCustomer(...args);
}

export async function listEmployees(...args: Parameters<typeof memoryRepo.listEmployees>) {
  return active().listEmployees(...args);
}

export async function createEmployee(...args: Parameters<typeof memoryRepo.createEmployee>) {
  return active().createEmployee(...args);
}

export async function patchEmployee(...args: Parameters<typeof memoryRepo.patchEmployee>) {
  return active().patchEmployee(...args);
}

export async function deleteEmployee(...args: Parameters<typeof memoryRepo.deleteEmployee>) {
  return active().deleteEmployee(...args);
}

export async function listActivities(...args: Parameters<typeof memoryRepo.listActivities>) {
  return active().listActivities(...args);
}

export async function addActivity(...args: Parameters<typeof memoryRepo.addActivity>) {
  return active().addActivity(...args);
}

export async function getSettings(...args: Parameters<typeof memoryRepo.getSettings>) {
  return active().getSettings(...args);
}

export async function updateSettings(...args: Parameters<typeof memoryRepo.updateSettings>) {
  return active().updateSettings(...args);
}

export async function listRecipes(...args: Parameters<typeof memoryRepo.listRecipes>) {
  return active().listRecipes(...args);
}

export async function upsertRecipe(...args: Parameters<typeof memoryRepo.upsertRecipe>) {
  return active().upsertRecipe(...args);
}

export async function deleteRecipe(...args: Parameters<typeof memoryRepo.deleteRecipe>) {
  return active().deleteRecipe(...args);
}

export async function listModifierGroups(...args: Parameters<typeof memoryRepo.listModifierGroups>) {
  return active().listModifierGroups(...args);
}

export async function createModifierGroup(...args: Parameters<typeof memoryRepo.createModifierGroup>) {
  return active().createModifierGroup(...args);
}

export async function patchModifierGroup(...args: Parameters<typeof memoryRepo.patchModifierGroup>) {
  return active().patchModifierGroup(...args);
}

export async function deleteModifierGroup(...args: Parameters<typeof memoryRepo.deleteModifierGroup>) {
  return active().deleteModifierGroup(...args);
}

export async function listFeedback(...args: Parameters<typeof memoryRepo.listFeedback>) {
  return active().listFeedback(...args);
}

export async function createFeedback(...args: Parameters<typeof memoryRepo.createFeedback>) {
  return active().createFeedback(...args);
}

export async function listCampaigns(...args: Parameters<typeof memoryRepo.listCampaigns>) {
  return active().listCampaigns(...args);
}

export async function createCampaign(...args: Parameters<typeof memoryRepo.createCampaign>) {
  return active().createCampaign(...args);
}

export async function patchCampaign(...args: Parameters<typeof memoryRepo.patchCampaign>) {
  return active().patchCampaign(...args);
}

export async function deleteCampaign(...args: Parameters<typeof memoryRepo.deleteCampaign>) {
  return active().deleteCampaign(...args);
}
