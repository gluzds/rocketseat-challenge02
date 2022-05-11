import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  /*   useEffect(() => {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }, [cart]); */

  async function addProduct(productId: number) {
    try {
      const productStock = await api.get<Stock>(`/stock/${productId}`);
      const product = cart.find(prod => prod.id === productId);
      if (product) {
        if (product?.amount >= productStock.data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }
      }
      if (productStock.data.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      let cartContains = false;
      const newCart = cart.map(item => {
        if (item.id === productId) {
          cartContains = true;
          return {
            ...item,
            amount: item.amount + 1,
          }
        }
        return item;
      });
      setCart(newCart);
      if (!cartContains) {
        const product = await api.get<Product>(`products/${productId}`);
        product.data.amount = 1;
        setCart([
          ...cart,
          product.data,
        ]);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  async function removeProduct(productId: number) {
    try {
      const index = cart.find(obj => obj.id === productId);
      if (index) {
        const newCart = cart.filter(prod => prod.id !== index.id);
        setCart(newCart);
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  async function updateProductAmount({
    productId,
    amount,
  }: UpdateProductAmount) {
    try {
      if (amount <= 0) {
        return
      }
      const productStock = await api.get<Stock>(`/stock/${productId}`);
      if (amount > productStock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        const newCart = cart.map(item => {
          if (item.id === productId) {
            return {
              ...item,
              amount: amount,
            }
          }
          return item;
        });
        setCart(newCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
