// Resolves a scanned barcode / typed code to a single asset record.
export const normalizeCode = (value) => (value || "").trim();

export function findAssetByCode(assets = [], rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const lower = code.toLowerCase();

  return (
    assets.find((asset) =>
      [
        asset.barcode,
        asset.serial_number,
        asset.asset_id
      ].some((field) => (field || "").trim().toLowerCase() === lower) ||
      asset.id === code
    ) || null
  );
}