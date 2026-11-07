import React, { useId, useMemo } from 'react';
import { INDIA_STATES, citiesFor, stateForCity } from '../../data/indiaLocations';

interface Props {
  state: string;
  city: string;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
  inputClassName: string;
  labelClassName?: string;
  required?: boolean;
  idPrefix?: string;
}

/**
 * State + City fields that accept typing AND show a pick-list (native datalist, works on mobile).
 * Picking a known city fills the state automatically.
 */
export const StateInput: React.FC<Omit<Props, 'city' | 'onCityChange'>> = ({ state, onStateChange, inputClassName, labelClassName, required = true, idPrefix = 'addr' }) => {
  const listId = `${idPrefix}-states-${useId().replace(/:/g, '')}`;
  return (
    <div className="space-y-1">
      <label className={labelClassName || 'text-xs font-semibold text-charcoal-600 dark:text-slate-300'}>State</label>
      <input
        type="text"
        required={required}
        list={listId}
        id={`${idPrefix}-state`}
        autoComplete="address-level1"
        placeholder="Type or select"
        value={state}
        onChange={(e) => onStateChange(e.target.value)}
        className={inputClassName}
      />
      <datalist id={listId}>
        {INDIA_STATES.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
};

export const CityInput: React.FC<Props> = ({ state, city, onStateChange, onCityChange, inputClassName, labelClassName, required = true, idPrefix = 'addr' }) => {
  const listId = `${idPrefix}-cities-${useId().replace(/:/g, '')}`;
  const cities = useMemo(() => citiesFor(state), [state]);
  return (
    <div className="space-y-1">
      <label className={labelClassName || 'text-xs font-semibold text-charcoal-600 dark:text-slate-300'}>City</label>
      <input
        type="text"
        required={required}
        list={listId}
        id={`${idPrefix}-city`}
        autoComplete="address-level2"
        placeholder="Type or select"
        value={city}
        onChange={(e) => {
          const v = e.target.value;
          onCityChange(v);
          if (!state) {
            const st = stateForCity(v);
            if (st) onStateChange(st);
          }
        }}
        className={inputClassName}
      />
      <datalist id={listId}>
        {cities.map((c) => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
};
