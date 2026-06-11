import React, { createContext, useContext, useState } from 'react';

/**
 * ViewAsContext — lets admins preview the site as a specific dealer.
 *
 * When viewAsDealer is set, API calls to /catalog will include
 * ?viewAs=<dealerId> so the backend computes pricing for that dealer.
 *
 * The admin stays logged in — only catalog pricing changes.
 */
const ViewAsContext = createContext(null);

export function ViewAsProvider({ children }) {
  // { _id, name, tier, registrationStatus } or null
  const [viewAsDealer, setViewAsDealer] = useState(null);

  function activateViewAs(dealer) {
    setViewAsDealer(dealer);
  }

  function clearViewAs() {
    setViewAsDealer(null);
  }

  return (
    <ViewAsContext.Provider value={{ viewAsDealer, activateViewAs, clearViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs must be used within ViewAsProvider');
  return ctx;
}
