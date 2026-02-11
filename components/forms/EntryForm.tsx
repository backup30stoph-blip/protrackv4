import React, { useState, useEffect } from 'react';
import { 
  Save, Search, FileText, Package, ShieldCheck, Scale, Truck, MapPin, Hash, AlertCircle, RotateCcw, Layers, Box, X, Pencil, Ban, ArrowRight, Flame, AlertTriangle, Camera, MessageSquare, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase.ts';
import { ProductionLogInput, PlatformType, ProductionLog, ShiftType } from '../../types.ts';
import { GET_CONFIG, ARTICLES, PALLET_OPTIONS, PLATFORM_CONFIG } from '../../constants.ts';
import { InputField } from '../ui/InputField.tsx';
import { ArticleSelect } from '../ui/ArticleSelect.tsx';
import { ShiftSelector } from '../ui/ShiftSelector.tsx';
import { CategoryTabs } from '../ui/CategoryTabs.tsx';
import SelectField from '../ui/SelectField.tsx';
import { ImageUploader } from '../ui/ImageUploader.tsx';
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
const AUTO_SAVE_INTERVAL = 30000; 
const LOW_STOCK_THRESHOLD = 5; 

export const EntryForm: React.FC<EntryFormProps> = ({ onSuccess, initialData, onCancel, platform }) => {
  const { fullName, platformAssignment, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  
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
    units_per_truck: 0, 
    bl_number: '',
    tc_number: '',
    seal_number: '',
    pallet_type: 'Avec Palet',
    reste_count: 0,
    file_number: '',
    destination: '',
    sap_code: '',
    truck_matricul: '',
    images: [],
    comments: ''
  });

  // Function to show notification
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, isVisible: true });
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 4000);
  };

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
        truck_matricul: initialData.truck_matricul || '',
        images: initialData.images || [],
        comments: initialData.comments || ''
      });
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
        }
      } catch (e) {
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
    if (!searchTerm) return;

    setIsSearching(true);
    try {
      let query = supabase.from('shipping_program').select('*').ilike('file_number', searchTerm);
      if (userRole !== 'admin' && platformAssignment && platformAssignment !== 'BOTH') {
         query = query.eq('platform_section', platformAssignment);
      }
      const { data: program, error: progError } = await query.maybeSingle();
      if (progError) throw progError;

      if (!program) {
        if (userRole !== 'admin' && platformAssignment) {
           const { data: actualPlatform } = await supabase.rpc('check_dossier_platform', { lookup_number: searchTerm });
           if (actualPlatform && actualPlatform !== platformAssignment) {
              setCrossPlatformError(`ACCESS DENIED: Dossier belongs to ${actualPlatform}.`);
              setIsSearching(false);
              return;
           }
        }
        showNotification(`Dossier "${searchTerm}" not found.`, 'error');
        setIsSearching(false);
        return;
      }

      const stock = program.planned_count || 0;
      setCurrentStock(stock);
      if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) setIsLowStock(true);

      setFormData(prev => ({
        ...prev,
        file_number: program.file_number,
        destination: program.destination || '',
        sap_code: program.sap_order_code || '',
        reste_count: stock,
        comments: prev.comments || program.special_instructions || ''
      }));

      if (program.special_instructions) {
        setDossierAlert(program.special_instructions);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Dossier lookup failed.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const config = GET_CONFIG(platform, formData.category);
    if (config.showTruckMatricul && !formData.truck_matricul?.trim()) {
        showNotification("Truck Matricul is required.", "error");
        setLoading(false);
        return;
    }

    try {
      const total_tonnage = parseFloat(calculateTonnage(formData.truck_count, formData.units_per_truck, formData.weight_per_unit));
      const finalReste = currentStock !== null ? (currentStock - (formData.truck_count || 0)) : formData.reste_count;

      const payload = {
        ...formData,
        shift: formData.shift.toUpperCase(),
        total_tonnage,
        reste_count: finalReste 
      };

      let error;
      if (initialData) {
        const { error: updateError } = await supabase.from('production_logs').update(payload).eq('id', initialData.id);
        error = updateError;
        if (!error) showNotification("Record updated successfully!", "success");
      } else {
        const { error: insertError } = await supabase.from('production_logs').insert([payload]);
        error = insertError;
        if (!error) showNotification("Production saved successfully!", "success");
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
          images: [],
          comments: ''
        }));
      }
    } catch (error: any) {
      showNotification('Failed to save record: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProductionLogInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const config = GET_CONFIG(platform, formData.category);
  const articles = ARTICLES[platform][formData.category] || [];
  const currentTotal = calculateTonnage(formData.truck_count, formData.units_per_truck, formData.weight_per_unit);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* NOTIFICATION OVERLAY */}
      {notification.isVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
            notification.type === 'success' 
              ? 'bg-emerald-500/90 text-white border-emerald-400' 
              : 'bg-rose-500/90 text-white border-rose-400'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
            <p className="font-bold text-sm tracking-tight">{notification.message}</p>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, isVisible: false }))}
              className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WELCOME BANNER */}
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl border border-indigo-100">
            {fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged In As</h2>
            <p className="text-xl font-bold text-slate-800 leading-tight">{fullName || 'Unknown User'}</p>
          </div>
        </div>
      </div>

      {/* OPERATOR HUD */}
      {!initialData && userRole !== 'admin' && formData.category === 'EXPORT' && <OperatorHUD />}

      <CategoryTabs activeCategory={formData.category} onCategoryChange={(cat) => handleChange('category', cat)} />

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* DOSSIER LOOKUP SECTION */}
        {config.requiresLogistics && (
          <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 shadow-inner relative overflow-hidden group">
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
               <button type="button" onClick={handleDossierLookup} className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl transition-all shadow-lg mb-[1px]">
                 {isSearching ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
               </button>
             </div>

             {/* DOSSIER SPECIAL INSTRUCTIONS ALERT */}
             {dossierAlert && (
               <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                 <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">Special Instructions Identified</h4>
                   <p className="text-sm text-rose-600 leading-relaxed font-medium">{dossierAlert}</p>
                 </div>
               </div>
             )}

             {/* REMAINDERS HUD */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
               <div className="opacity-70"><InputField label="Destination" icon={MapPin} value={formData.destination || ''} disabled className="bg-slate-50" /></div>
               <div className="opacity-70"><InputField label="SAP Code" icon={Hash} value={formData.sap_code || ''} disabled className="bg-slate-50" /></div>
               <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1.5">Remaining Qty</label>
                  <div className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 font-black text-xl shadow-sm ${isLowStock ? 'text-rose-600 border-rose-300 ring-2 ring-rose-100' : 'text-emerald-600 border-slate-300'}`}>
                    <Package className={`w-5 h-5 opacity-50 ${isLowStock ? 'text-rose-400' : 'text-slate-400'}`} />
                    {currentStock !== null ? currentStock : formData.reste_count}
                  </div>
               </div>
             </div>
          </div>
        )}

        {/* --- DYNAMIC EVIDENCE & COMMENT SECTION --- */}
        <div className="space-y-6">
          {/* IMAGE UPLOADER: Specific for BIG_BAG EXPORT ONLY */}
          {platform === 'BIG_BAG' && formData.category === 'EXPORT' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Camera className="text-indigo-600 w-5 h-5" /> Attach Loading Evidence
              </h3>
              <ImageUploader 
                images={formData.images || []} 
                onChange={(newImages) => handleChange('images', newImages)} 
                maxImages={8}
              />
            </div>
          )}

          {/* COMMENTAIRE SECTION: Always visible below evidence area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
             <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <MessageSquare className="text-amber-500 w-5 h-5" /> Observations / Notification
             </h3>
             <div className="space-y-1.5">
               <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                 Commentaire
               </label>
               <textarea
                 value={formData.comments || ''}
                 onChange={(e) => handleChange('comments', e.target.value)}
                 placeholder="Ajouter des notes importantes sur cette opération (ex: anomalies, retards, état camion...)"
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[100px] resize-none shadow-inner"
               />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShiftSelector value={formData.shift} onChange={(val) => handleChange('shift', val)} />
          <ArticleSelect value={formData.article_code} onChange={(val) => handleChange('article_code', val)} options={articles} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField label="Truck Count" type="number" icon={Truck} value={formData.truck_count || ''} onChange={(e) => handleChange('truck_count', parseFloat(e.target.value))} required min={1} />
          <InputField label={`${config.unitLabel} ${config.isUnitFixed ? '(Fixed)' : ''}`} type="number" icon={Layers} value={formData.units_per_truck || ''} onChange={(e) => handleChange('units_per_truck', parseFloat(e.target.value))} required disabled={config.isUnitFixed} />
          {config.fixedWeight !== null ? (
             <InputField label="Weight (Fixed)" value={`${config.fixedWeight} T`} disabled icon={Scale} />
          ) : config.allowedWeights && config.allowedWeights.length > 0 ? (
             <SelectField label="Weight / Unit (T)" icon={Scale} value={formData.weight_per_unit?.toString() || ''} onChange={(val) => handleChange('weight_per_unit', parseFloat(val))} options={config.allowedWeights.map(w => ({ id: w.toString(), label: `${w} T` }))} />
          ) : (
            <InputField label="Weight per Unit (T)" type="number" step="0.001" icon={Scale} value={formData.weight_per_unit || ''} onChange={(e) => handleChange('weight_per_unit', parseFloat(e.target.value))} required />
          )}
        </div>

        {/* OPTIONAL ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {config.showPalletType && (
            <SelectField label="Pallet Type" icon={Layers} value={formData.pallet_type || ''} onChange={(val) => handleChange('pallet_type', val)} options={PALLET_OPTIONS} />
          )}
          {config.showResteInput && (
            <InputField label="Adjust Reste" type="number" value={formData.reste_count} onChange={(e) => handleChange('reste_count', parseFloat(e.target.value))} />
          )}
          {config.showTruckMatricul && (
            <InputField label="Truck Matricule" icon={Truck} value={formData.truck_matricul || ''} onChange={(e) => handleChange('truck_matricul', e.target.value)} required />
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

        {/* SUMMARY & SUBMIT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto">
             <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">Total Output</span>
             <div className="text-5xl font-black text-slate-800 tracking-tighter">{currentTotal} <span className="text-2xl text-indigo-600 font-bold">T</span></div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className={`w-full md:w-auto text-white px-10 py-5 rounded-xl font-black text-lg uppercase flex justify-center items-center gap-3 transition-all active:scale-95 shadow-xl ${
              loading 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-200'
            }`}
          >
            {loading ? (
              <><RotateCcw className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              <><Save size={20} /> Submit Entry</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};