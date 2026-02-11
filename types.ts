
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
  user_id?: string; 
  
  // Core Dimensions
  category: OperationCategory;
  shift: ShiftType;
  article_code: string;
  platform: PlatformType; 
  
  // Quantitative Metrics
  truck_count: number;
  units_per_truck: number; 
  weight_per_unit: number; 
  total_tonnage: number;   
  
  // Optional Operational Data
  reste_count?: number;
  pallet_type?: PalletType;
  
  // Logistics Data
  bl_number?: string;   
  tc_number?: string;   
  seal_number?: string; 
  
  // Extended Shipping Data
  file_number?: string;    
  booking_ref?: string;    
  customer?: string;       
  maritime_agent?: string; 
  destination?: string;    
  sap_code?: string;       

  // Local Market Data
  truck_matricul?: string; 

  // Multi-image support
  images?: string[];
  
  // New: Field for observations/notes
  comments?: string;
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
  start_date_raw: string; 
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
