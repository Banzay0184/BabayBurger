// Типы для Yandex Maps API
declare global {
  interface Window {
    ymaps?: any;
  }
}

export interface YandexMapInstance {
  geoObjects: {
    add: (geoObject: any) => void;
    remove: (geoObject: any) => void;
    removeAll: () => void;
  };
  getCenter: () => [number, number];
  setCenter: (center: [number, number], zoom?: number) => void;
  setZoom: (zoom: number) => void;
  destroy: () => void;
}

export interface YandexPlacemark {
  geometry: {
    getCoordinates: () => [number, number];
    setCoordinates: (coordinates: [number, number]) => void;
  };
  properties: {
    set: (key: string, value: any) => void;
    get: (key: string) => any;
  };
}

export interface YandexCircle {
  geometry: {
    getCoordinates: () => [number, number];
    getRadius: () => number;
    setCoordinates: (coordinates: [number, number]) => void;
    setRadius: (radius: number) => void;
  };
  options: {
    set: (options: any) => void;
  };
}

export interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  delivery_fee: number;
  min_order_amount?: number;
  is_active: boolean;
  coordinates?: [number, number][]; // Массив координат для полигона [долгота, широта]
}

export interface MapAddress {
  coordinates: [number, number];
  address: string;
  street?: string;
  house?: string;
  city?: string;
}
