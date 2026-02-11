/**
 * Calculates the total tonnage based on logistics inputs.
 * Formula: Trucks * Units * Weight
 */
export const calculateTonnage = (
  truckCount: number | undefined | null,
  unitsPerTruck: number | undefined | null,
  weightPerUnit: number | undefined | null
): string => {
  // 1. Safety Checks (Handle missing/undefined values)
  const trucks = truckCount || 0;
  const units = unitsPerTruck || 0;
  const weight = weightPerUnit || 0;

  // 2. Calculation
  const total = trucks * units * weight;

  // 3. Formatting (Standardize to 3 decimal places)
  return total.toFixed(3);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(num);
};

export const formatCurrency = (num: number): string => {
   return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(num);
};