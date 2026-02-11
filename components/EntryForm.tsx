import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Truck, 
  Scale, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Package, 
  Clock, 
  Factory,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { GET_CONFIG, SHIFTS, PALLET_OPTIONS, ARTICLE_LABELS, ARTICLES } from '../constants';
import { OperationCategory, ShiftType, PalletType, ProductionLog, PlatformType } from '../types';
import InputField from './ui/InputField';
import SelectField from './ui/SelectField';
import { calculateTonnage } from '../utils/calculations';

interface EntryFormProps {
  onAddOrder: (order: Omit<ProductionLog, 'id' | 'created_at'>) => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ onAddOrder }) => {
  // --- State ---
  const [category, setCategory] = useState<OperationCategory>('EXPORT');
  const [shift, setShift] = useState<ShiftType>('morning');
  const [articleCode, setArticleCode] = useState<string>('');
  
  const [truckCount, setTruckCount] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [resteCount, setResteCount] = useState<string>('');
  const [palletType, setPalletType] = useState<string>('Avec Palet');
  const [platformType, setPlatformType] = useState<PlatformType>('50KG');
  
  // Logistics
  const [blNumber, setBlNumber] = useState<string>('');
  const [tcNumber, setTcNumber] = useState<string>('');
  const [sealNumber, setSealNumber] = useState<string>('');

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Derived Config ---
  const config = GET_CONFIG(platformType, category);

  // Determine Default Weight based on Platform + Category
  const activeDefaultWeight = config.fixedWeight;
  
  // Update pallet default based on category logic
  useEffect(() => {
    if (category === 'DEBARDAGE') {
      setPalletType('Sans Palet');
    } else {
      setPalletType('Avec Palet');
    }
  }, [category]);

  // Reset Article and Errors when Category changes
  useEffect(() => {
    setArticleCode('');
    setErrors({});
  }, [category]);

  // --- Handlers ---
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!articleCode) newErrors.articleCode = 'Article is required';
    if (!truckCount) newErrors.truckCount = 'Truck count is required';
    if (parseInt(truckCount) <= 0) newErrors.truckCount = 'Must be > 0';

    if (activeDefaultWeight === null && !weightInput) {
      newErrors.weightInput = 'Weight is required';
    }

    if (config.requiresLogistics) {
      if (!blNumber) newErrors.blNumber = 'BL No. required';
      if (!tcNumber) newErrors.tcNumber = 'TC No. required';
      if (!sealNumber) newErrors.sealNumber = 'Seal No. required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateCurrentTonnage = () => {
    const trucks = parseInt(truckCount, 10) || 0;
    const weight = activeDefaultWeight ?? (parseFloat(weightInput) || 0);
    return calculateTonnage(trucks, config.defaultUnits, weight);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const trucks = parseInt(truckCount, 10);
    const weight = activeDefaultWeight ?? parseFloat(weightInput);
    
    const totalTonnageStr = calculateTonnage(trucks, config.defaultUnits, weight);
    const totalTonnage = parseFloat(totalTonnageStr);
    
    const newOrder: Omit<ProductionLog, 'id' | 'created_at'> = {
      category,
      shift,
      article_code: articleCode,
      platform: platformType,
      truck_count: trucks,
      weight_per_unit: weight,
      total_tonnage: totalTonnage,
      units_per_truck: config.defaultUnits,
      reste_count: resteCount ? parseInt(resteCount, 10) : undefined,
      pallet_type: palletType as PalletType,
      bl_number: config.requiresLogistics ? blNumber : undefined,
      tc_number: config.requiresLogistics ? tcNumber : undefined,
      seal_number: config.requiresLogistics ? sealNumber : undefined,
    };

    onAddOrder(newOrder);
    handleReset();
  };

  const handleReset = () => {
    setTruckCount('');
    setWeightInput('');
    setResteCount('');
    setBlNumber('');
    setTcNumber('');
    setSealNumber('');
    setErrors({});
  };

  // --- Options Generation ---
  const availableArticles = ARTICLES[platformType][category] || [];
  const articleOptions = availableArticles.map(code => ({
    id: code,
    label: `${code} - ${ARTICLE_LABELS[code] || 'Unknown'}`
  }));

  const isLogisticsRequired = config.requiresLogistics;

  // Derive display values for summary
  const currentMultiplier = config.defaultUnits;
  
  const unitLabel = config.unitLabel;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm relative overflow-hidden">
      
      {/* Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 py-2 px-6 flex items-center gap-2 text-xs text-red-400 font-bold animate-in slide-in-from-top-2">
          <AlertCircle size={14} />
          Please fix the highlighted errors before saving.
        </div>
      )}

      <div className="flex items-center justify-between mb-6 mt-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Factory className="text-indigo-500" />
          NEW ENTRY
        </h2>
        <button 
          type="button" 
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={14} /> RESET
        </button>
      </div>

      {/* Row 1: Core Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SelectField 
          label="Operation Type" 
          icon={Layers}
          value={category} 
          onChange={(v) => setCategory(v as OperationCategory)}
          options={[
            { id: 'EXPORT', label: 'EXPORT OPERATIONS' },
            { id: 'LOCAL', label: 'LOCAL MARKET' },
            { id: 'DEBARDAGE', label: 'DEBARDAGE' },
          ]}
        />
        <SelectField 
          label="Shift" 
          icon={Clock}
          value={shift} 
          onChange={(v) => setShift(v as ShiftType)}
          options={SHIFTS.map(s => ({ id: s.id, label: s.label }))}
        />
        <SelectField 
          label="Article" 
          icon={Package}
          value={articleCode} 
          onChange={setArticleCode}
          options={articleOptions}
          placeholder="Select Article Code"
          error={errors.articleCode}
        />
        <SelectField 
          label="Platform Type" 
          icon={Package}
          value={platformType} 
          onChange={(v) => setPlatformType(v as PlatformType)}
          options={[
             { id: '50KG', label: '50kg (Sac)' },
             { id: 'BIG_BAG', label: 'Big Bag' },
          ]}
        />
      </div>

      {/* Row 2: Quantities */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <InputField 
          label="Truck Count" 
          icon={Truck}
          type="number" 
          value={truckCount}
          onChange={(e) => setTruckCount(e.target.value)}
          placeholder="0"
          min="1"
          error={errors.truckCount}
        />
        
        {/* Weight: Hidden if Fixed */}
        {activeDefaultWeight === null ? (
          <InputField 
            label="Weight / Unit (T)" 
            icon={Scale}
            type="number" 
            step="0.001"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="e.g. 1.25"
            error={errors.weightInput}
          />
        ) : (
          <div className="flex flex-col gap-1.5 opacity-60">
             <label className="uppercase text-[10px] font-bold text-slate-400 tracking-wider">
               Weight (Fixed)
             </label>
             <div className="w-full bg-slate-800/50 text-slate-300 font-medium border border-slate-700 rounded-md py-2.5 px-3 flex items-center gap-2">
                <Scale size={18} />
                <span>{activeDefaultWeight} T</span>
             </div>
          </div>
        )}

        <SelectField 
          label="Pallet Type" 
          value={palletType}
          onChange={setPalletType}
          options={PALLET_OPTIONS}
        />
        
        <InputField 
          label="Reste (Optional)" 
          type="number" 
          value={resteCount}
          onChange={(e) => setResteCount(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Tonnage Preview Summary */}
      <div className="mb-6 p-3 bg-blue-900/20 rounded-lg border border-blue-900/50 flex items-center justify-between">
         <span className="text-xs font-bold text-blue-300 uppercase">Estimated Output</span>
         <div className="text-right">
            <span className="text-lg font-black text-white">{calculateCurrentTonnage()} T</span>
            <div className="text-[10px] text-blue-400">
              {truckCount || 0} Trucks × {currentMultiplier} {unitLabel} × {activeDefaultWeight ?? (weightInput || 0)} T
            </div>
         </div>
      </div>

      {/* Row 3: Logistics (Conditional) */}
      {isLogisticsRequired && (
        <div className={`mb-6 p-4 bg-slate-900/50 rounded-lg border ${Object.keys(errors).some(k => ['blNumber', 'tcNumber', 'sealNumber'].includes(k)) ? 'border-red-500/30' : 'border-slate-700/50'}`}>
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} /> Logistics Data Required
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField 
              label="Bill of Lading (BL)" 
              icon={FileText}
              value={blNumber}
              onChange={(e) => setBlNumber(e.target.value)}
              placeholder="N° BL"
              error={errors.blNumber}
            />
            <InputField 
              label="Container Num (TC)" 
              icon={Package}
              value={tcNumber}
              onChange={(e) => setTcNumber(e.target.value)}
              placeholder="N° TC"
              error={errors.tcNumber}
            />
            <InputField 
              label="Seal Number" 
              icon={ShieldCheck}
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
              placeholder="N° Plombe"
              error={errors.sealNumber}
            />
          </div>
        </div>
      )}

      {/* Submit Action */}
      <button 
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
      >
        <Save size={18} /> Record Entry
      </button>
    </form>
  );
};

export default EntryForm;