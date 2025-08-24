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
  events: {
    add: (eventType: string, handler: (event: any) => void) => void;
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
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
  delivery_fee: number;
  min_order_amount?: number;
  is_active: boolean;
  coordinates?: [number, number][]; // Массив координат для полигона [долгота, широта]
  polygon_coordinates?: [number, number][]; // Массив координат для полигона [широта, долгота]
  // Стилизация полигона
  polygon_fill_color?: string;
  polygon_fill_opacity?: number;
  polygon_stroke_color?: string;
  polygon_stroke_width?: number;
  polygon_stroke_opacity?: number;
}

export interface MapAddress {
  coordinates: [number, number];
  address: string;
  street?: string;
  house?: string;
  city?: string;
}
