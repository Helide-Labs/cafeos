export const PRODUCT_CATEGORIES = [
  "Coffee",
  "Tea",
  "Cold drinks",
  "Bakery",
  "Food",
  "Desserts",
  "Merchandise",
  "Other",
] as const;

export const CATEGORY_EMOJI: Record<string, string[]> = {
  Coffee: ["C", "☕", "🫘"],
  Tea: ["T", "🍵", "🍃"],
  "Cold drinks": ["I", "🥤", "🧊"],
  Bakery: ["B", "🥐", "🥖"],
  Food: ["F", "🥪", "🥑"],
  Desserts: ["D", "🍰", "🍪"],
  Merchandise: ["M", "🎁", "👕"],
  Other: ["P", "✨", "⭐"],
};

export const DEFAULT_CATEGORY_EMOJI: Record<string, string> = {
  Coffee: "☕",
  Tea: "🍵",
  "Cold drinks": "🥤",
  Bakery: "🥐",
  Food: "🥪",
  Desserts: "🍰",
  Merchandise: "🎁",
  Other: "✨",
};

export async function fileToProductImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WebP).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be under 8 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 480;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 700_000 && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > 900_000) {
    throw new Error("Could not compress image enough. Try a simpler photo.");
  }

  return dataUrl;
}
