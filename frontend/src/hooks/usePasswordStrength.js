import { useMemo } from 'react';
import { getPasswordStrength } from '../utils/validators';

export function usePasswordStrength(password) {
  return useMemo(() => getPasswordStrength(password), [password]);
}
