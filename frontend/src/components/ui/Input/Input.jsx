import React from 'react';
import styles from './Input.module.css';

export function Input({ 
  label, 
  error, 
  type = 'text', 
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  ...rest 
}) {
  const inputId = id || name;
  const hasError = Boolean(error);

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`${styles.input} ${hasError ? styles.error : ''} ${disabled ? styles.disabled : ''}`}
        {...rest}
      />
      {hasError && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
