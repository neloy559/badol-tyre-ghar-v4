import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchInput.module.css';

const DEBOUNCE_MS = 500;

export default function SearchInput({ value, onChange, placeholder = 'Search products...' }) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) {
        onChange(localValue);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  function handleClear() {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
  }

  return (
    <div className={styles.searchWrap}>
      <Search size={20} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.input}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder={placeholder}
      />
      {localValue && (
        <button type="button" className={styles.clearBtn} onClick={handleClear}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}
