import React from 'react';
import { Package } from 'lucide-react';

export interface ParcelValues {
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

/** True when a product has a packed weight and a full box size on record. */
export const hasParcelDetails = (p: ParcelValues | null | undefined): boolean =>
  !!p && Number(p.weightGrams) > 0 && Number(p.lengthCm) > 0 && Number(p.widthCm) > 0 && Number(p.heightCm) > 0;

interface Props {
  value: ParcelValues;
  onChange: (patch: ParcelValues) => void;
  /** New products must have all four values; older products are only reminded. */
  required: boolean;
}

/**
 * Packed weight and box size of ONE unit of the product. The backend uses these to work out the
 * EKART courier charge (billable weight = the higher of actual weight and L × B × H ÷ 5).
 */
export const ParcelFields: React.FC<Props> = ({ value, onChange, required }) => {
  const field = (key: keyof ParcelValues, label: string, placeholder: string, max: number) => (
    <div>
      <label className="block text-[#777777] mb-1" htmlFor={`parcel-${key}`}>{label}{required ? ' *' : ''}</label>
      <input
        id={`parcel-${key}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        required={required}
        placeholder={placeholder}
        value={value[key] ?? ''}
        onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : Math.round(Number(e.target.value)) })}
        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
      />
    </div>
  );
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3" id="parcel-fields">
      <div className="flex items-start gap-2">
        <Package className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-slate-900">Parcel weight and box size (one unit, packed)</p>
          <p className="text-[11px] text-slate-500">
            Used to work out the EKART courier charge for each order. The charge is based on the higher of the
            actual weight and the box volume (Length × Width × Height ÷ 5).
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {field('weightGrams', 'Weight (grams)', 'e.g. 1050', 100000)}
        {field('lengthCm', 'Length (cm)', 'e.g. 20', 300)}
        {field('widthCm', 'Width (cm)', 'e.g. 15', 300)}
        {field('heightCm', 'Height (cm)', 'e.g. 10', 300)}
      </div>
      {!required && !hasParcelDetails(value) && (
        <p className="text-[11px] font-semibold text-amber-700">
          This product has no complete weight and box size yet. Until it does, courier charges are estimated with 1 kg and a 10 × 10 × 10 cm box.
        </p>
      )}
    </div>
  );
};
