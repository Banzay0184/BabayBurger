import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { cashierApi, type CashierData, type Order } from '../api/cashierApi';

export type CashierViewType = 'preparing' | 'ready' | 'completed';

interface CashierState {
  cashier: CashierData | null;
  orders: Order[];
  loading: boolean;
  error: string | null;
  activeView: CashierViewType;
  setCashier: (cashier: CashierData | null) => void;
  setOrders: (orders: Order[]) => void;
  addOrUpdateOrder: (order: Order) => void;
  updateOrderStatus: (orderId: number, status: string) => void;
  removeOrder: (orderId: number) => void;
  setActiveView: (view: CashierViewType) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchOrders: () => Promise<void>;
}

const storeCreator: StateCreator<CashierState> = (set) => ({
  cashier: null,
  orders: [],
  loading: true,
  error: null,
  activeView: 'preparing',

  setCashier: (cashier: CashierData | null) => set({ cashier }),
  setOrders: (orders: Order[]) => set({ orders }),
  addOrUpdateOrder: (order: Order) => set((state) => {
    const exists = state.orders.some((o: Order) => o.id === order.id);
    return { orders: exists ? state.orders.map((o: Order) => o.id === order.id ? order : o) : [order, ...state.orders] };
  }),
  updateOrderStatus: (orderId: number, status: string) => set((state) => ({
    orders: state.orders.map((o: Order) => o.id === orderId ? { ...o, status } : o)
  })),
  removeOrder: (orderId: number) => set((state) => ({ orders: state.orders.filter((o: Order) => o.id !== orderId) })),
  setActiveView: (view: CashierViewType) => set({ activeView: view }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const orders = await cashierApi.getOrders();
      set({ orders });
    } catch (e: any) {
      set({ error: e?.message || 'Ошибка загрузки данных' });
    } finally {
      set({ loading: false });
    }
  }
});

export const useCashierStore = create<CashierState>()(devtools(storeCreator));


