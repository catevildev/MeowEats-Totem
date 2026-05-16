import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Produto, Extra } from '@workspace/api-client-react';

export interface CartItem {
  id: string; // unique local id for cart instance
  produto: Produto;
  quantidade: number;
  extras: Extra[];
  observacoes?: string;
  precoTotal: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (produto: Produto, quantidade: number, extras: Extra[], observacoes?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantidade: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  orderType: 'comer_aqui' | 'para_viagem' | null;
  setOrderType: (type: 'comer_aqui' | 'para_viagem') => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'comer_aqui' | 'para_viagem' | null>(null);

  const addItem = (produto: Produto, quantidade: number, extras: Extra[], observacoes?: string) => {
    const extrasTotal = extras.reduce((sum, extra) => sum + extra.preco, 0);
    const precoUnitario = produto.preco + extrasTotal;
    
    const newItem: CartItem = {
      id: Math.random().toString(36).substring(2, 9),
      produto,
      quantidade,
      extras,
      observacoes,
      precoTotal: precoUnitario * quantidade,
    };
    
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeItem(id);
      return;
    }
    
    setItems((prev) => 
      prev.map((item) => {
        if (item.id === id) {
          const unitPrice = item.precoTotal / item.quantidade;
          return { ...item, quantidade, precoTotal: unitPrice * quantidade };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setOrderType(null);
  };

  const total = items.reduce((sum, item) => sum + item.precoTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      orderType,
      setOrderType
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
