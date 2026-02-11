
// The 3 Main Operation Categories
export type OperationCategory = 'EXPORT' | 'LOCAL' | 'DEBARDAGE';

// Shift Types
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'EVENING';

export type PalletType = 'Avec Palet' | 'Sans Palet' | 'Palet Plastic' | 'Avec Palet Plastic';

export type PlatformType = 'BIG_BAG' | '50KG';

// The Main Data Record
export interface ProductionLog {
  id: string; // UUID
  created_at: string;
  user_id?: string; // New: Ownership tracking
  
  // Core Dimensions
  category: OperationCategory;
  shift: ShiftType;
  article_code: string;
  platform: PlatformType; // Updated from platform_type
  
  // Quantitative Metrics
  truck_count: number;
  units_per_truck: number; // NEW: Sacs (50kg) or Columns (BB)
  weight_per_unit: number; // Export = Variable, Others = 1.2
  total_tonnage: number;   // Calculated
  
  // Optional Operational Data
  reste_count?: number;
  pallet_type?: PalletType;
  
  // Logistics Data (Required for EXPORT, Null for others)
  bl_number?: string;   // Bill of Lading
  tc_number?: string;   // Container Number
  seal_number?: string; // Plombe
  
  // Extended Shipping Data (Export Program)
  file_number?: string;    // N° Dossier
  booking_ref?: string;    // Booking Reference
  customer?: string;       // Client / CLTS
  maritime_agent?: string; // Agent Maritime
  destination?: string;    // Destination Port/Country
  sap_code?: string;       // SAP Order Code

  // Local Market Data
  truck_matricul?: string; // Matricule Camion
}

export interface ProductionLogInput extends Omit<ProductionLog, 'id' | 'created_at' | 'total_tonnage' | 'user_id'> {
  // Input fields excluding system/calc fields
}

// Shipping Program from CSV
export interface ShippingProgram {
  id: string; // UUID
  external_id: number; // Original CSV ID
  file_number: string; // N° Dossier
  sap_order_code: string;
  destination: string;
  planned_count: number;
  planned_quantity: number;
  shipping_line: string;
  start_date_raw: string; // Text format from CSV
  deadline_raw: string;
  special_instructions: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// SQL VIEW: Daily Production Summary
export interface DailyProductionStat {
  production_date: string;
  production_month: string;
  production_year: number;
  platform: PlatformType;
  category: OperationCategory;
  total_trucks: number;
  total_tonnage: number;
  morning_tonnage: number;
  afternoon_tonnage: number;
  night_tonnage: number;
  active_operators: number;
}