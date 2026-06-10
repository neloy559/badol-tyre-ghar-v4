import React from 'react';
import styles from './ToggleSwitch.module.css';

export function ToggleSwitch({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  id,
  name
}) {
  const toggleId = id || name || `toggle-${Math.random()}`;

  return (
    <div className={styles.container}>
      <label className={`${styles.switch} ${disabled ? styles.disabled : ''}`} htmlFor={toggleId}>
        <input
          id={toggleId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={styles.checkbox}
        />
        <span className={styles.slider}></span>
      </label>
      {label && (
        <label htmlFor={toggleId} className={styles.label}>
          {label}
        </label>
      )}
    </div>
  );
}
