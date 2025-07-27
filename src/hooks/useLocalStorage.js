import { useState, useCallback } from 'react';

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
};

export const useOrderData = () => {
  const [orders, setOrders] = useLocalStorage('castingOrders', []);
  
  const addOrder = useCallback((order) => {
    const newOrder = {
      ...order,
      id: Date.now().toString(),
      totalWeight: order.unitWeight * order.quantity
    };
    setOrders(prev => [...prev, newOrder]);
  }, [setOrders]);

  const updateOrder = useCallback((id, updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order.id === id 
        ? { ...updatedOrder, totalWeight: updatedOrder.unitWeight * updatedOrder.quantity }
        : order
    ));
  }, [setOrders]);

  const deleteOrder = useCallback((id) => {
    setOrders(prev => prev.filter(order => order.id !== id));
  }, [setOrders]);

  return { orders, addOrder, updateOrder, deleteOrder, setOrders };
};

export const useProductData = () => {
  const [products, setProducts] = useLocalStorage('castingProducts', []);
  
  const addProduct = useCallback((product) => {
    const newProduct = {
      ...product,
      id: Date.now().toString(),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    };
    setProducts(prev => [...prev, newProduct]);
  }, [setProducts]);

  const updateProduct = useCallback((id, updatedProduct) => {
    setProducts(prev => prev.map(product => 
      product.id === id 
        ? { ...updatedProduct, updatedDate: new Date().toISOString().split('T')[0] }
        : product
    ));
  }, [setProducts]);

  const deleteProduct = useCallback((id) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  }, [setProducts]);

  return { products, addProduct, updateProduct, deleteProduct, setProducts };
};

export const useCustomerData = () => {
  const [customers, setCustomers] = useLocalStorage('castingCustomers', []);
  
  const addCustomer = useCallback((customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now().toString(),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    };
    setCustomers(prev => [...prev, newCustomer]);
  }, [setCustomers]);

  const updateCustomer = useCallback((id, updatedCustomer) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === id 
        ? { ...updatedCustomer, updatedDate: new Date().toISOString().split('T')[0] }
        : customer
    ));
  }, [setCustomers]);

  const deleteCustomer = useCallback((id) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  }, [setCustomers]);

  return { customers, addCustomer, updateCustomer, deleteCustomer, setCustomers };
};