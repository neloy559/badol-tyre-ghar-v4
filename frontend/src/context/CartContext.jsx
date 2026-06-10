import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext  = createContext(null);
const STORAGE_KEY  = 'btg_cart_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadFromStorage);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage full — silently ignore
    }
  }, [items]);

  function addToCart(product, variant, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(
        i => i.product._id === product._id && i.variant.sku === variant.sku
      );
      if (existing) {
        return prev.map(i =>
          i.product._id === product._id && i.variant.sku === variant.sku
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, variant, quantity }];
    });
  }

  function removeFromCart(productId, variantSku) {
    setItems(prev =>
      prev.filter(i => !(i.product._id === productId && i.variant.sku === variantSku))
    );
  }

  // Set absolute quantity (min 1)
  function setQty(productId, variantSku, qty) {
    const clamped = Math.max(1, Math.floor(qty));
    setItems(prev =>
      prev.map(i =>
        i.product._id === productId && i.variant.sku === variantSku
          ? { ...i, quantity: clamped }
          : i
      )
    );
  }

  // Delta-based qty change (kept for backward compat)
  function updateQty(productId, variantSku, delta) {
    setItems(prev =>
      prev.map(i =>
        i.product._id === productId && i.variant.sku === variantSku
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  }

  function clear() {
    setItems([]);
  }

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, addToCart, removeFromCart, setQty, updateQty, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
