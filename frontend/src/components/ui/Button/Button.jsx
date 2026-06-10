import React from 'react';
import styles from './Button.module.css';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...rest 
}) {
  const isDisabled = disabled || isLoading;
  
  let variantClass = styles.primary;
  if (variant === 'secondary') variantClass = styles.secondary;
  if (variant === 'outline')   variantClass = styles.outline;
  if (variant === 'danger')    variantClass = styles.danger;
  if (variant === 'ghost')     variantClass = styles.ghost;

  let sizeClass = styles.md;
  if (size === 'sm') sizeClass = styles.sm;
  if (size === 'lg') sizeClass = styles.lg;

  const combinedClass = `${styles.button} ${variantClass} ${sizeClass} ${isLoading ? styles.loading : ''} ${isDisabled ? styles.disabled : ''} ${className}`;

  return (
    <button 
      type={type}
      className={combinedClass}
      onClick={onClick}
      disabled={isDisabled}
      {...rest}
    >
      {isLoading ? <span className={styles.spinner}></span> : children}
    </button>
  );
}
