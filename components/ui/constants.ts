
import { OperationCategory, PlatformType, ShiftType } from './types.ts';

// 1. ARTICLE CODES
export const ARTICLES: Record<PlatformType, Record<OperationCategory, string[]>> = {
  // BIG BAG LISTS
  'BIG_BAG': {
    EXPORT: ['4301', '4302'],
    LOCAL: ['4300', '4318', '4312', '4303'],
    DEBARDAGE: ['4303']
  },
  // 50KG LIST
  '50KG': {
    EXPORT: ['4002', '4317', '4304', '4312', '4303', '4300', '4302', '4301', '4409', '4406', '4405', '4532', '4512', '4514', '4500'],
    LOCAL: ['4002', '4317', '4304', '4312', '4303', '4300', '4302', '4301', '4409', '4406', '4405', '4532', '4512', '4514', '4500'],
    DEBARDAGE: ['4002', '4317', '4304', '4312', '4303', '4300', '4302', '4301', '4409', '4406', '4405', '4532', '4512', '4514', '4500']
  }
};

interface ConfigResult {
  label: string;
  unitLabel: string;
  defaultUnits: number;
  isUnitFixed: boolean;
  defaultWeight: number | null;
  fixedWeight: number | null;
  requiresLogistics: boolean;
  showPalletType: boolean;
  // New Constraints
  allowedPallets?: string[]; // If defined, only these IDs are valid
  allowedWeights?: number[]; // If defined, weight becomes a dropdown
  showResteInput?: boolean;  // Defaults to true if undefined
  showTruckMatricul?: boolean; // Defaults to false
}

// 2. UNIFIED PLATFORM CONFIGURATION
// This is the "Source of Truth" for all business logic.
const BUSINESS_LOGIC: Record<PlatformType, Record<OperationCategory, ConfigResult>> = {
  'BIG_BAG': {
    EXPORT: {
      label: 'Export',
      unitLabel: 'Columns',
      defaultUnits: 20,       // Standard Big Bag Export columns
      isUnitFixed: true,      // User cannot change columns
      defaultWeight: 1.1,     // Default to 1.1T
      fixedWeight: null,      // Variable, but restricted to specific options
      requiresLogistics: true,// Needs BL/TC/Seal
      showPalletType: true,   // "Avec/Sans Palet"
      allowedWeights: [1.1, 1.2],
      allowedPallets: ['Avec Palet', 'Sans Palet'],
      showResteInput: false,  // Disabled for Export as it's handled by automatic stock
      showTruckMatricul: false
    },
    LOCAL: {
      label: 'Local',
      unitLabel: 'Columns',
      defaultUnits: 22,       // Standard Big Bag Local columns
      isUnitFixed: true,
      defaultWeight: 1.2,     // Fixed weight
      fixedWeight: 1.2,
      requiresLogistics: false,
      showPalletType: true,
      allowedPallets: ['Sans Palet'], // Only Sans Palet
      showResteInput: false, // Removed for Local
      showTruckMatricul: true // Added for Local
    },
    DEBARDAGE: {
      label: 'Débardage',
      unitLabel: 'Columns',
      defaultUnits: 20,       // Standard Big Bag Debardage columns
      isUnitFixed: true,
      defaultWeight: 1.2,     // Fixed weight
      fixedWeight: 1.2,
      requiresLogistics: false,
      showPalletType: true,
      allowedPallets: ['Avec Palet Plastic'], // Only Avec Palet Plastic
      showResteInput: false, // Removed for Debardage
      showTruckMatricul: false
    }
  },
  '50KG': {
    EXPORT: {
      label: 'Export',
      unitLabel: 'Sacs (Bags)',
      defaultUnits: 500,      // Default start (User can edit 500-600)
      isUnitFixed: false,     // Editable
      defaultWeight: 0.05,    // 50kg = 0.05T
      fixedWeight: 0.05,      // Weight is ALWAYS fixed
      requiresLogistics: true,
      showPalletType: false,   // 50KG is always sans palet (usually)
      showResteInput: false,  // Disabled for Export as it's handled by automatic stock
      showTruckMatricul: false
    },
    LOCAL: {
      label: 'Local',
      unitLabel: 'Sacs (Bags)',
      defaultUnits: 0,        // User must enter count
      isUnitFixed: false,
      defaultWeight: 0.05,
      fixedWeight: 0.05,
      requiresLogistics: false,
      showPalletType: false,
      showResteInput: true,
      showTruckMatricul: false
    },
    DEBARDAGE: {
      label: 'Débardage',
      unitLabel: 'Sacs (Bags)',
      defaultUnits: 560,      // Strict rule for Debardage
      isUnitFixed: true,      // User cannot change count
      defaultWeight: 0.05,
      fixedWeight: 0.05,
      requiresLogistics: false,
      showPalletType: false,
      showResteInput: true,
      showTruckMatricul: false
    }
  }
};

// 3. DYNAMIC CONFIG GETTER
export const GET_CONFIG = (platform: PlatformType, category: OperationCategory): ConfigResult => {
  if (!platform || !category) {
    // Fallback safety to prevent app crash on init
    return BUSINESS_LOGIC['BIG_BAG']['EXPORT'];
  }
  return BUSINESS_LOGIC[platform][category];
};

export const PLATFORM_CONFIG = {
  'BIG_BAG': { label: 'Big Bag' },
  '50KG': { label: '50kg (Sac)' }
};

// Article Label Definitions (Helper for UI display)
export const ARTICLE_LABELS: Record<string, string> = {
  '4301': 'Ciment CPJ 45',
  '4302': 'Ciment CPJ 35',
  '4300': 'Clinker',
  '4318': 'Ciment VRAC',
  '4312': 'Ciment SAC',
  '4303': 'Special',
  // Add 50KG codes if needed, or they default to Unknown
};

// SHIFT CONFIGURATION
export const SHIFTS = [
  { 
    id: 'morning' as ShiftType, 
    label: 'Morning Shift (06h - 14h)', 
    shortLabel: 'Morning',
    value: 'morning' 
  },
  { 
    id: 'afternoon' as ShiftType, 
    label: 'Afternoon Shift (14h - 22h)', 
    shortLabel: 'Afternoon',
    value: 'afternoon'
  },
  { 
    id: 'night' as ShiftType, 
    label: 'Night Shift (22h - 06h)', 
    shortLabel: 'Night',
    value: 'night'
  }
];

export const PALLET_OPTIONS = [
  { id: 'Avec Palet', label: 'Avec Palet' },
  { id: 'Sans Palet', label: 'Sans Palet' },
  { id: 'Palet Plastic', label: 'Palet Plastic' },
  { id: 'Avec Palet Plastic', label: 'Avec Palet Plastic' },
];
