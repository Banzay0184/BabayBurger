import { clientApi } from './unifiedClient';
import type { ApiResponse } from './types';

export type Id = number | string;

export interface AdminCategory {
  id: number;
  name: string;
  description?: string;
  image?: string;
}

export interface AdminMenuItem {
  id: number;
  name: string;
  description?: string;
  price: string | number;
  category: number;
  image?: string;
  is_hit?: boolean;
  is_new?: boolean;
  priority?: number;
}

export interface AdminAddOn {
  id: number;
  name: string;
  price: string | number;
  category?: number | null;
  available_for_categories?: number[];
  is_active?: boolean;
}

export interface AdminSizeOption {
  id: number;
  name: string;
  price_modifier: string | number;
  description?: string;
  menu_item: number;
  is_active?: boolean;
}

export interface AdminPromotion {
  id: number;
  name: string;
  description?: string;
  discount_type: 'percent' | 'fixed' | 'bogo';
  discount_value?: string | number;
  min_order_amount?: string | number;
  max_discount?: string | number;
  usage_count?: number;
  max_uses?: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
  applicable_items?: number[];
  free_item?: number | null;
  free_addon?: number | null;
}

export const adminApi = {
  // Menu Items
  async listMenuItems(): Promise<ApiResponse<AdminMenuItem[]>> {
    try {
      const data = await clientApi.get<AdminMenuItem[]>('menu-items/');
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async createMenuItem(payload: Partial<AdminMenuItem>): Promise<ApiResponse<AdminMenuItem>> {
    try {
      const data = await clientApi.post<AdminMenuItem>('menu-items/', payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async updateMenuItem(id: Id, payload: Partial<AdminMenuItem>): Promise<ApiResponse<AdminMenuItem>> {
    try {
      const data = await clientApi.patch<AdminMenuItem>(`menu-items/${id}/`, payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async deleteMenuItem(id: Id): Promise<ApiResponse<{}>> {
    try {
      const data = await clientApi.delete<{}>(`menu-items/${id}/`);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Add-ons
  async listAddOns(): Promise<ApiResponse<AdminAddOn[]>> {
    try {
      const data = await clientApi.get<AdminAddOn[]>('add-ons/');
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async createAddOn(payload: Partial<AdminAddOn>): Promise<ApiResponse<AdminAddOn>> {
    try {
      const data = await clientApi.post<AdminAddOn>('add-ons/', payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async updateAddOn(id: Id, payload: Partial<AdminAddOn>): Promise<ApiResponse<AdminAddOn>> {
    try {
      const data = await clientApi.patch<AdminAddOn>(`add-ons/${id}/`, payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async deleteAddOn(id: Id): Promise<ApiResponse<{}>> {
    try {
      const data = await clientApi.delete<{}>(`add-ons/${id}/`);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Size options
  async listSizeOptions(): Promise<ApiResponse<AdminSizeOption[]>> {
    try {
      const data = await clientApi.get<AdminSizeOption[]>('size-options/');
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async createSizeOption(payload: Partial<AdminSizeOption>): Promise<ApiResponse<AdminSizeOption>> {
    try {
      const data = await clientApi.post<AdminSizeOption>('size-options/', payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async updateSizeOption(id: Id, payload: Partial<AdminSizeOption>): Promise<ApiResponse<AdminSizeOption>> {
    try {
      const data = await clientApi.patch<AdminSizeOption>(`size-options/${id}/`, payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async deleteSizeOption(id: Id): Promise<ApiResponse<{}>> {
    try {
      const data = await clientApi.delete<{}>(`size-options/${id}/`);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Promotions
  async listPromotions(): Promise<ApiResponse<AdminPromotion[]>> {
    try {
      const data = await clientApi.get<AdminPromotion[]>('promotions/');
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async createPromotion(payload: Partial<AdminPromotion>): Promise<ApiResponse<AdminPromotion>> {
    try {
      const data = await clientApi.post<AdminPromotion>('promotions/', payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async updatePromotion(id: Id, payload: Partial<AdminPromotion>): Promise<ApiResponse<AdminPromotion>> {
    try {
      const data = await clientApi.patch<AdminPromotion>(`promotions/${id}/`, payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async deletePromotion(id: Id): Promise<ApiResponse<{}>> {
    try {
      const data = await clientApi.delete<{}>(`promotions/${id}/`);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },

  // Promo codes: нет DRF ViewSet на бэке. Эти методы заработают после добавления router.register('promo-codes', PromoCodeViewSet)
  async listPromoCodes(): Promise<ApiResponse<any[]>> {
    try {
      const data = await clientApi.get<any[]>('promo-codes/');
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async createPromoCode(payload: any): Promise<ApiResponse<any>> {
    try {
      const data = await clientApi.post<any>('promo-codes/', payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async updatePromoCode(id: Id, payload: any): Promise<ApiResponse<any>> {
    try {
      const data = await clientApi.patch<any>(`promo-codes/${id}/`, payload);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  },
  async deletePromoCode(id: Id): Promise<ApiResponse<{}>> {
    try {
      const data = await clientApi.delete<{}>(`promo-codes/${id}/`);
      return { data, success: true };
    } catch (error: any) {
      return { error, success: false };
    }
  }
};

export default adminApi;


