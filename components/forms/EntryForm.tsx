import React, { useState, useEffect } from 'react';
import { 
  Save, Search, FileText, Package, ShieldCheck, Scale, Truck, MapPin, Hash, AlertCircle, RotateCcw, Layers, Box, X, Pencil, Ban, ArrowRight, Flame, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase.ts';
import { ProductionLogInput, PlatformType, ProductionLog, ShiftType } from '../../types.ts';
import { GET_CONFIG, ARTICLES, PALLET_OPTIONS, PLATFORM_CONFIG } from '../../constants.ts';
import { InputField } from '../ui/InputField.tsx';
import { ArticleSelect } from '../ui/ArticleSelect.tsx';
import { ShiftSelector } from '../ui/ShiftSelector.tsx';
import { CategoryTabs } from '../ui/CategoryTabs.tsx';
import SelectField from '../ui/SelectField.tsx';
import { calculateTonnage } from '../../utils/calculations.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { OperatorHUD } from '../analytics/OperatorHUD.tsx';

interface EntryFormProps {
  onSuccess?: () => void;
  initialData?: ProductionLog | null;
  onCancel?: () => void;
  platform: PlatformType; // Prop from parent
}

const DRAFT_KEY = 'protrack_entry_draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const LOW_STOCK_THRESHOLD = 5; // Trucks

export const EntryForm: React.FC<EntryFormProps> = ({ onSuccess, initialData, onCancel, platform }) => {
  const { fullName, platformAssignment, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [dossierAlert, setDossierAlert] = useState<string | null>(null);
  const [crossPlatformError, setCrossPlatformError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [isLowStock, setIsLowStock] = useState(false);

  const [formData, setFormData] = useState<ProductionLogInput>({
    category: 'EXPORT',
    shift: 'morning',
    article_code: '',
    platform: platform, 
    truck_count: 0,
    weight_per_unit: 0,
    units_per_truck: 0, // Sacs or Columns
    bl_number: '',
    tc_number: '',
    seal_number: '',
    pallet_type: 'Avec Palet',
    reste_count: 0,
    file_number: '',
    destination: '',
    sap_code: '',
    truck_matricul: '' // New Field
  });

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setFormData({
        category: initialData.category,
        shift: initialData.shift.toLowerCase() as ShiftType,
        article_code: initialData.article_code,
        platform: initialData.platform,
        truck_count: initialData.truck_count,
        weight_per_unit: initialData.weight_per_unit,
        units_per_truck: initialData.units_per_truck || 0,
        bl_number: initialData.bl_number || '',
        tc_number: initialData.tc_number || '',
        seal_number: initialData.seal_number || '',
        pallet_type: initialData.pallet_type || 'Avec Palet',
        reste_count: initialData.reste_count || 0,
        file_number: initialData.file_number || '',
        destination: initialData.destination || '',
        sap_code: initialData.sap_code || '',
        truck_matricul: initialData.truck_matricul || ''
      });
      // If editing, we might need to fetch current stock to show context, but skipping for now to keep simple
    } else {
      setFormData(prev => ({ ...prev, platform: platform }));
    }
  }, [initialData, platform]);

  // Load Draft on Mount
  useEffect(() => {
    if (initialData) return;

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.category) {
          setFormData({ ...parsed, platform: platform });
          console.log("Draft restored from localStorage");
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [initialData, platform]);

  // Auto-Save
  useEffect(() => {
    if (initialData) return;
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      setLastSaved(new Date());
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [formData, initialData]);

  // Reset/Config Logic
  useEffect(() => {
    if (initialData) return; 

    const config = GET_CONFIG(platform, formData.category);
    
    // Determine Weight
    let newWeight = formData.weight_per_unit || 0;
    if (config.fixedWeight !== null) {
        newWeight = config.fixedWeight;
    } else if (config.allowedWeights && config.allowedWeights.length > 0) {
        // If current weight is not in allowed list, default to first allowed
        if (!config.allowedWeights.includes(newWeight)) {
            newWeight = config.allowedWeights[0];
        }
    } else if (config.defaultWeight !== null && newWeight === 0) {
        newWeight = config.defaultWeight;
    }

    // Determine Pallet
    let newPallet = formData.pallet_type;
    if (config.showPalletType && config.allowedPallets && config.allowedPallets.length > 0) {
         if (!config.allowedPallets.includes(newPallet || '')) {
             newPallet = config.allowedPallets[0] as any;
         }
    } else if (config.showPalletType && !newPallet) {
         newPallet = 'Avec Palet';
    }

    setFormData(prev => ({
      ...prev,
      platform: platform,
      weight_per_unit: newWeight,
      units_per_truck: config.defaultUnits,
      pallet_type: newPallet,
      bl_number: config.requiresLogistics ? prev.bl_number : '',
      tc_number: config.requiresLogistics ? prev.tc_number : '',
      seal_number: config.requiresLogistics ? prev.seal_number : '',
      truck_matricul: config.showTruckMatricul ? prev.truck_matricul : '',
    }));
    setDossierAlert(null);
    setCrossPlatformError(null);
    setCurrentStock(null);
    setIsLowStock(false);
  }, [formData.category, platform, initialData]);

  const handleDossierLookup = async () => {
    const searchTerm = formData.file_number?.trim();
    
    if (!searchTerm) {
      alert("Please enter a Dossier Number first.");
      return;
    }

    setIsSearching(true);
    setDossierAlert(null);
    setCrossPlatformError(null);
    setCurrentStock(null);
    setIsLowStock(false);

    try {
      let query = supabase
        .from('shipping_program')
        .select('*')
        .ilike('file_number', searchTerm);

      if (userRole !== 'admin' && platformAssignment && platformAssignment !== 'BOTH') {
         query = query.eq('platform_section', platformAssignment);
      }

      const { data: program, error: progError } = await query.maybeSingle();

      if (progError) throw progError;

      if (!program) {
        if (userRole !== 'admin' && platformAssignment) {
           const { data: actualPlatform } = await supabase.rpc('check_dossier_platform', { lookup_number: searchTerm });
           
           if (actualPlatform && actualPlatform !== platformAssignment) {
              const formattedPlatform = actualPlatform.replace('_', ' ');
              const formattedUser = platformAssignment.replace('_', ' ');
              setCrossPlatformError(`ACCESS DENIED: Dossier "${searchTerm}" belongs to ${formattedPlatform}. You are authorized for ${formattedUser} only.`);
              setIsSearching(false);
              return;
           }
        }
        console.warn("❌ Dossier not found in DB.");
        alert(`Dossier "${searchTerm}" not found or access denied.`);
        setIsSearching(false);
        return;
      }

      // New Logic: The DB handles decrementing, so planned_count IS the current stock.
      const stock = program.planned_count || 0;
      setCurrentStock(stock);
      
      // SMART ALERT LOGIC
      if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
        setIsLowStock(true);
      }

      setFormData(prev => ({
        ...prev,
        file_number: program.file_number,
        destination: program.destination || '',
        sap_code: program.sap_order_code || '',
        reste_count: stock, // We display current stock initially
      }));

      if (program.special_instructions) {
        setDossierAlert(program.special_instructions);
      }

    } catch (err: any) {
      console.error("🚨 System Error:", err);
      if (err.message?.includes('check_dossier_platform')) {
         alert(`Dossier "${searchTerm}" not found.`);
      } else {
         alert('Error searching dossier: ' + err.message);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const calculateTonnageValue = () => {
    return calculateTonnage(
      formData.truck_count,
      formData.units_per_truck,
      formData.weight_per_unit
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const config = GET_CONFIG(platform, formData.category);

    // Validate Truck Matricul if shown
    if (config.showTruckMatricul && !formData.truck_matricul?.trim()) {
        alert("Truck Matricul is required for this category.");
        setLoading(false);
        return;
    }

    try {
      const total_tonnage = parseFloat(calculateTonnageValue());
      // Calculate final remaining if we are tracking logistics
      const finalReste = currentStock !== null ? (currentStock - (formData.truck_count || 0)) : formData.reste_count;

      const payload = {
        ...formData,
        shift: formData.shift.toUpperCase(),
        total_tonnage,
        reste_count: finalReste // Save the calculated remaining
      };

      let error;
      
      if (initialData) {
        const { error: updateError } = await supabase
          .from('production_logs')
          .update(payload)
          .eq('id', initialData.id);
        error = updateError;
        setSuccessMessage("Record updated successfully!");
      } else {
        const { error: insertError } = await supabase
          .from('production_logs')
          .insert([payload]);
        error = insertError;
        setSuccessMessage("Record saved successfully!");
        localStorage.removeItem(DRAFT_KEY);
      }

      if (error) throw error;
      
      if (onSuccess) onSuccess();

      if (!initialData) {
        setFormData(prev => ({ 
          ...prev, 
          truck_count: 0, 
          bl_number: '', 
          tc_number: '', 
          seal_number: '',
          truck_matricul: '',
          // Update local state to reflect the drop immediately, although a new lookup is safer
          reste_count: Math.max(0, finalReste || 0) 
        }));
        if (currentStock !== null) {
           setCurrentStock(finalReste);
           // Re-evaluate low stock based on new local stock
           setIsLowStock(finalReste > 0 && finalReste <= LOW_STOCK_THRESHOLD);
        }
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProductionLogInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'file_number') {
       setCrossPlatformError(null);
    }
  };

  const config = GET_CONFIG(platform, formData.category);
  const articles = ARTICLES[platform][formData.category] || [];
  
  const currentTotal = calculateTonnageValue();
  const adjustedReste = currentStock !== null ? (currentStock - (formData.truck_count || 0)) : null;

  // Filter Pallet Options based on Config
  const currentPalletOptions = config.allowedPallets 
    ? PALLET_OPTIONS.filter(p => config.allowedPallets!.includes(p.id))
    : PALLET_OPTIONS;

  return (
    <div className="max-w-4xl mx-auto">

      {/* --- WELCOME BANNER --- */}
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl border border-indigo-100">
            {fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged In As</h2>
            <p className="text-xl font-bold text-slate-800 leading-tight">
              {fullName || 'Unknown User'}
            </p>
          </div>
        </div>
        <div className="text-right hidden md:block px-4 border-l border-slate-100">
           <span className="text-xs font-mono text-indigo-600 font-bold">{new Date().toLocaleDateString()}</span>
           <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">System Online</div>
        </div>
      </div>

      {/* --- OPERATOR HUD (HEADS UP DISPLAY) --- */}
      {/* HUD is only shown for EXPORT category, removed for LOCAL and DEBARDAGE per request */}
      {!initialData && userRole !== 'admin' && formData.category === 'EXPORT' && (
        <OperatorHUD />
      )}

      {/* Edit Mode Banner */}
      {initialData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
           <div className="flex items-center gap-3">
             <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
               <Pencil size={20} />
             </div>
             <div>
               <h3 className="text-amber-700 font-bold text-sm uppercase tracking-wide">Editing Record</h3>
               <p className="text-xs text-amber-600/70 font-mono mt-0.5">ID: {initialData.id.split('-')[0]}...</p>
             </div>
           </div>
           {onCancel && (
             <button 
               onClick={onCancel}
               className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white px-3 py-2 rounded-lg transition-colors border border-slate-200 hover:border-slate-400"
             >
               <X size={14} /> Cancel
             </button>
           )}
        </div>
      )}

      {/* Platform Banner */}
      {!initialData && (
        <div className={`mb-8 p-1 rounded-2xl bg-gradient-to-r ${platform === 'BIG_BAG' ? 'from-indigo-50 to-transparent' : 'from-emerald-50 to-transparent'}`}>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
             <div className={`p-3 rounded-xl ${platform === 'BIG_BAG' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
               {platform === 'BIG_BAG' ? <Box size={24} /> : <Package size={24} />}
             </div>
             <div>
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Production Line</span>
               <div className="text-2xl font-black text-slate-800 tracking-tight">{PLATFORM_CONFIG[platform].label}</div>
             </div>
          </div>
        </div>
      )}

      {/* CRITICAL CROSS-PLATFORM ERROR BANNER */}
      {crossPlatformError && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-4 animate-bounce-short shadow-sm">
           <div className="bg-rose-100 text-rose-600 p-2 rounded-lg shrink-0">
             <Ban size={24} />
           </div>
           <div>
             <h3 className="text-rose-600 font-black text-lg uppercase tracking-tight">Restricted Access</h3>
             <p className="text-rose-700 font-medium leading-relaxed mt-1 text-sm whitespace-pre-line">
               {crossPlatformError}
             </p>
           </div>
        </div>
      )}

      <CategoryTabs 
        activeCategory={formData.category} 
        onCategoryChange={(cat) => handleChange('category', cat)} 
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* DOSSIER LOOKUP SECTION (Required for Export) */}
        {config.requiresLogistics && (
          <div className={`
             bg-slate-100 p-6 rounded-2xl border 
             ${crossPlatformError ? 'border-rose-300' : 'border-slate-300'}
             shadow-inner relative overflow-hidden group
          `}>
             <div className="flex items-end gap-3 relative z-10 mb-6">
               <div className="flex-1">
                 <InputField 
                    label="N° Dossier (Required)" 
                    icon={FileText} 
                    value={formData.file_number || ''}
                    onChange={(e) => handleChange('file_number', e.target.value)}
                    placeholder="e.g. 8267/EXPSU"
                    onBlur={handleDossierLookup}
                    error={crossPlatformError ? "Restricted Dossier" : undefined}
                    className="bg-white"
                 />
               </div>
               <button 
                 type="button"
                 onClick={handleDossierLookup}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 mb-[1px]"
                 title="Search Dossier"
               >
                 {isSearching ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
               </button>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
               <div className="opacity-70">
                  <InputField label="Destination" icon={MapPin} value={formData.destination || ''} disabled className="cursor-not-allowed bg-slate-50" />
               </div>
               <div className="opacity-70">
                  <InputField label="SAP Code" icon={Hash} value={formData.sap_code || ''} disabled className="cursor-not-allowed bg-slate-50" />
               </div>
               <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1.5">Remaining Qty</label>
                  <div className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 font-black text-xl shadow-sm ${
                      isLowStock ? 'text-rose-600 border-rose-300 ring-2 ring-rose-100' : 'text-emerald-600 border-slate-300'
                    }`}>
                    <Package className={`w-5 h-5 opacity-50 ${isLowStock ? 'text-rose-400' : 'text-slate-400'}`} />
                    {currentStock !== null ? currentStock : formData.reste_count}
                  </div>
               </div>
             </div>

             {/* --- SMART ALERTS SECTION --- */}
             
             {/* 1. Low Stock Alert */}
             {isLowStock && (
                <div className="mt-4 bg-gradient-to-r from-rose-600 to-orange-500 rounded-xl p-4 shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/10 animate-[pulse_2s_infinite]"></div>
                   <div className="flex items-center gap-4 relative z-10 text-white">
                      <div className="p-2 bg-white/20 rounded-full">
                         <Flame size={24} className="animate-pulse" />
                      </div>
                      <div>
                         <h3 className="font-black text-sm uppercase tracking-wider">High Priority Dossier</h3>
                         <p className="text-xs font-medium opacity-90 mt-0.5">Only {currentStock} trucks remaining. Prepare to close.</p>
                      </div>
                   </div>
                   <div className="relative z-10 bg-white/20 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider">
                      Finish Fast
                   </div>
                </div>
             )}

             {/* AUTOMATIC INVENTORY HUD */}
             {currentStock !== null && (
              <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between relative z-10 animate-in fade-in slide-in-from-top-4 shadow-xl">
                
                {/* Current */}
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Current Stock</p>
                  <p className="text-2xl font-mono font-bold text-white">
                    {currentStock}
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-slate-500 flex flex-col items-center">
                   <span className="text-[10px] font-bold text-rose-400 mb-1">-{formData.truck_count || 0}</span>
                   <ArrowRight size={20} />
                </div>

                {/* New Balance */}
                <div className="text-center">
                  <p className="text-[10px] uppercase text-emerald-500 font-bold tracking-wider">Adjust Reste</p>
                  <p className={`text-2xl font-mono font-bold ${(adjustedReste || 0) < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {adjustedReste}
                  </p>
                </div>

              </div>
             )}

            {/* Overbooking Warning */}
            {currentStock !== null && (adjustedReste || 0) < 0 && (
                <div className="mt-2 text-xs text-rose-600 font-bold flex items-center gap-2 bg-rose-50 p-2 rounded border border-rose-200">
                    <AlertTriangle size={14} /> ⚠️ Warning: This entry exceeds planned quantity (Overbooking)!
                </div>
            )}

             {dossierAlert && !crossPlatformError && !isLowStock && (
               <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                 <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-xs font-bold uppercase text-amber-600 tracking-wider mb-1">Alert</h4>
                   <p className="text-sm text-amber-800 font-medium leading-relaxed">{dossierAlert}</p>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* INPUT GRID ROW 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShiftSelector value={formData.shift} onChange={(val) => handleChange('shift', val)} />
          <ArticleSelect value={formData.article_code} onChange={(val) => handleChange('article_code', val)} options={articles} />
        </div>

        {/* INPUT GRID ROW 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField 
            label="Truck Count" type="number" icon={Truck} placeholder="e.g. 15"
            value={formData.truck_count || ''}
            onChange={(e) => handleChange('truck_count', parseFloat(e.target.value))}
            required min={1}
          />

          {config.isUnitFixed ? (
             <div className="opacity-50 cursor-not-allowed grayscale">
               <InputField 
                 label={`${config.unitLabel} (Fixed)`} 
                 value={formData.units_per_truck} 
                 disabled 
                 icon={Layers}
               />
             </div>
          ) : (
             <InputField 
               label={config.unitLabel} 
               type="number" 
               icon={Layers}
               value={formData.units_per_truck || ''}
               onChange={(e) => handleChange('units_per_truck', parseFloat(e.target.value))}
               placeholder={platform === '50KG' ? "500-600" : "20"}
               required
             />
          )}

          {/* WEIGHT INPUT: Dynamic based on Config (Fixed vs Select vs Input) */}
          {config.fixedWeight !== null ? (
             <div className="opacity-50 cursor-not-allowed grayscale">
               <InputField label="Weight (Fixed)" value={`${config.fixedWeight} T`} disabled icon={Scale} />
             </div>
          ) : config.allowedWeights && config.allowedWeights.length > 0 ? (
             <SelectField 
                label="Weight / Unit (T)"
                icon={Scale}
                value={formData.weight_per_unit?.toString() || ''}
                onChange={(val) => handleChange('weight_per_unit', parseFloat(val))}
                options={config.allowedWeights.map(w => ({ id: w.toString(), label: `${w} T` }))}
             />
          ) : (
            <InputField 
              label="Weight per Unit (T)" 
              type="number" step="0.001" icon={Scale} placeholder="e.g. 1.250"
              value={formData.weight_per_unit || ''}
              onChange={(e) => handleChange('weight_per_unit', parseFloat(e.target.value))}
              required
            />
          )}
        </div>

        {/* OPTIONAL ROW (Dynamic based on Category) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {config.showPalletType && (
            <SelectField 
              label="Pallet Type"
              icon={Layers} // Changed from Layers2 to Layers for compatibility
              value={formData.pallet_type || (currentPalletOptions[0]?.id || '')}
              onChange={(val) => handleChange('pallet_type', val)}
              options={currentPalletOptions}
            />
          )}
          
          {(config.showResteInput !== false) && (
            <InputField 
              label="Adjust Reste (Optional)" 
              type="number" 
              value={formData.reste_count}
              onChange={(e) => handleChange('reste_count', parseFloat(e.target.value))}
              placeholder="0"
            />
          )}

          {/* Truck Matricul - Special highlight for LOCAL */}
          {config.showTruckMatricul && (
             <div className="md:col-span-1 bg-amber-50 p-1 rounded-xl border border-amber-200/50">
                <InputField 
                  label="Truck Matricule (Plate N°)"
                  icon={Truck}
                  value={formData.truck_matricul || ''}
                  onChange={(e) => handleChange('truck_matricul', e.target.value)}
                  placeholder="e.g. 12345-A-6"
                  required
                  className="bg-white"
                />
             </div>
          )}
        </div>

        {/* LOGISTICS */}
        {config.requiresLogistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="N° BL" icon={FileText} value={formData.bl_number || ''} onChange={(e) => handleChange('bl_number', e.target.value)} required />
            <InputField label="N° TC" icon={Package} value={formData.tc_number || ''} onChange={(e) => handleChange('tc_number', e.target.value)} required />
            <InputField label="N° Plombe" icon={ShieldCheck} value={formData.seal_number || ''} onChange={(e) => handleChange('seal_number', e.target.value)} required />
          </div>
        )}

        {/* --- HUD TONNAGE CALCULATOR --- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-indigo-200 transition-colors relative overflow-hidden">
          
          <div className="w-full md:w-auto relative z-10">
             <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">Calculated Total Output</span>
             
             {/* Big Total */}
             <div className="text-5xl font-black text-slate-800 tracking-tighter flex items-baseline gap-2">
               {currentTotal} <span className="text-2xl text-indigo-600 font-bold">T</span>
             </div>
             
             {/* Formula */}
             <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
               <span className="text-slate-800 font-bold">{formData.truck_count || 0}</span> Trk
               <span className="text-slate-400">×</span>
               <span className="text-slate-800 font-bold">{formData.units_per_truck || 0}</span> Unit
               <span className="text-slate-400">×</span>
               <span className="text-slate-800 font-bold">{formData.weight_per_unit || 0}</span> T
             </div>
             
             {lastSaved && !initialData && (
               <div className="text-[9px] text-emerald-600 mt-3 font-mono flex items-center gap-1 opacity-70">
                 <Save size={10} /> Auto-saved: {lastSaved.toLocaleTimeString()}
               </div>
             )}
          </div>

          <button 
            type="submit" disabled={loading}
            className={`
              relative z-10 w-full md:w-auto 
              ${initialData ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
              px-10 py-5 rounded-xl 
              font-black text-lg uppercase tracking-wide flex justify-center items-center gap-3
              disabled:opacity-50 disabled:grayscale transition-all active:scale-95 shadow-xl shadow-indigo-200
            `}
          >
            {loading ? 'Processing...' : (
              initialData 
              ? <><Save className="w-5 h-5" /> Update Record</> 
              : <><Save className="w-5 h-5" /> Submit Entry</>
            )}
          </button>
        </div>

        {successMessage && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce font-bold flex items-center gap-3 z-50 border border-white/20">
             <div className="bg-white/20 p-1 rounded-full"><Save className="w-4 h-4" /></div> {successMessage}
          </div>
        )}
      </form>
    </div>
  );
};
