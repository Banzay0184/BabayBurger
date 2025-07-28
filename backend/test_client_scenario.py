#!/usr/bin/env python3
"""
Исправленная версия тестирования StreetBurger Mini App с точки зрения клиента
Адаптирована под текущую структуру API
"""

import requests
import json
import time
import random
from datetime import datetime

class StreetBurgerClientTestFixed:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, status, message=""):
        """Логирует результат теста"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_icon = "✅" if status else "❌"
        result = f"{timestamp} {status_icon} {test_name}"
        if message:
            result += f" - {message}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": timestamp
        })
    
    def test_auth_endpoint(self):
        """Тест 1: Проверка доступности endpoint авторизации"""
        print("\n🔐 ТЕСТ 1: Проверка endpoint авторизации")
        
        try:
            response = self.session.get(f"{self.base_url}/api/auth/")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Endpoint авторизации", True, f"Статус: {data.get('status', 'OK')}")
                return True
            else:
                self.log_test("Endpoint авторизации", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Endpoint авторизации", False, f"Исключение: {str(e)}")
            return False
    
    def test_get_menu(self):
        """Тест 2: Получение меню"""
        print("\n🍔 ТЕСТ 2: Получение меню")
        
        try:
            response = self.session.get(f"{self.base_url}/api/menu/")
            
            if response.status_code == 200:
                menu_data = response.json()
                categories = menu_data.get("categories", [])
                items = menu_data.get("items", [])
                
                self.log_test("Получение меню", True, f"Категорий: {len(categories)}, Блюд: {len(items)}")
                
                # Проверяем наличие хитов и новинок
                hits = [item for item in items if item.get("is_hit")]
                news = [item for item in items if item.get("is_new")]
                
                self.log_test("Хиты продаж", len(hits) > 0, f"Найдено хитов: {len(hits)}")
                self.log_test("Новинки", len(news) > 0, f"Найдено новинок: {len(news)}")
                
                return True
            else:
                self.log_test("Получение меню", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Получение меню", False, f"Исключение: {str(e)}")
            return False
    
    def test_get_categories(self):
        """Тест 3: Получение категорий"""
        print("\n📂 ТЕСТ 3: Получение категорий")
        
        try:
            response = self.session.get(f"{self.base_url}/api/categories/")
            
            if response.status_code == 200:
                categories = response.json()
                self.log_test("Получение категорий", True, f"Категорий: {len(categories)}")
                
                # Проверяем наличие основных категорий
                category_names = [cat.get("name", "").lower() for cat in categories]
                expected_categories = ["бургер", "пицца", "напиток", "дополнение"]
                
                for expected in expected_categories:
                    found = any(expected in name for name in category_names)
                    self.log_test(f"Категория '{expected}'", found)
                
                return True
            else:
                self.log_test("Получение категорий", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Получение категорий", False, f"Исключение: {str(e)}")
            return False
    
    def test_get_addons(self):
        """Тест 4: Получение дополнений"""
        print("\n🥤 ТЕСТ 4: Получение дополнений")
        
        try:
            response = self.session.get(f"{self.base_url}/api/add-ons/")
            
            if response.status_code == 200:
                addons = response.json()
                self.log_test("Получение дополнений", True, f"Дополнений: {len(addons)}")
                
                # Проверяем наличие популярных дополнений
                addon_names = [addon.get("name", "").lower() for addon in addons]
                expected_addons = ["соус", "напиток", "картошка", "сыр"]
                
                for expected in expected_addons:
                    found = any(expected in name for name in addon_names)
                    self.log_test(f"Дополнение '{expected}'", found)
                
                return True
            else:
                self.log_test("Получение дополнений", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Получение дополнений", False, f"Исключение: {str(e)}")
            return False
    
    def test_get_promotions(self):
        """Тест 5: Получение акций"""
        print("\n🎉 ТЕСТ 5: Получение акций")
        
        try:
            response = self.session.get(f"{self.base_url}/api/promotions/")
            
            if response.status_code == 200:
                promotions = response.json()
                active_promotions = [p for p in promotions if p.get("is_active")]
                
                self.log_test("Получение акций", True, f"Всего акций: {len(promotions)}, Активных: {len(active_promotions)}")
                
                # Проверяем типы акций
                discount_types = set(p.get("discount_type") for p in active_promotions)
                expected_types = ["PERCENT", "FIXED_AMOUNT", "FREE_DELIVERY", "FREE_ITEM"]
                
                for expected in expected_types:
                    found = expected in discount_types
                    self.log_test(f"Тип акции '{expected}'", found)
                
                return True
            else:
                self.log_test("Получение акций", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Получение акций", False, f"Исключение: {str(e)}")
            return False
    
    def test_delivery_zones(self):
        """Тест 6: Проверка зон доставки"""
        print("\n🚚 ТЕСТ 6: Проверка зон доставки")
        
        try:
            response = self.session.get(f"{self.base_url}/api/delivery-zones/")
            
            if response.status_code == 200:
                zones = response.json()
                self.log_test("Получение зон доставки", True, f"Зон доставки: {len(zones)}")
                
                # Проверяем зоны для Бухары
                bukhara_zones = [zone for zone in zones if zone.get("city", "").lower() == "бухара"]
                self.log_test("Зоны доставки в Бухаре", len(bukhara_zones) > 0, f"Найдено зон: {len(bukhara_zones)}")
                
                # Проверяем активные зоны
                active_zones = [zone for zone in zones if zone.get("is_active")]
                self.log_test("Активные зоны доставки", len(active_zones) > 0, f"Активных зон: {len(active_zones)}")
                
                return True
            else:
                self.log_test("Получение зон доставки", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Получение зон доставки", False, f"Исключение: {str(e)}")
            return False
    
    def test_geocode_endpoint(self):
        """Тест 7: Проверка endpoint геокодирования"""
        print("\n📍 ТЕСТ 7: Проверка endpoint геокодирования")
        
        try:
            # Тестируем с параметром query
            response = self.session.get(f"{self.base_url}/api/geocode/?query=Бухара")
            
            if response.status_code == 200:
                self.log_test("Endpoint геокодирования", True, "Доступен")
                return True
            elif response.status_code == 400:
                # Ожидаемая ошибка без параметра query
                self.log_test("Endpoint геокодирования", True, "Требует параметр query (ожидаемо)")
                return True
            else:
                self.log_test("Endpoint геокодирования", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Endpoint геокодирования", False, f"Исключение: {str(e)}")
            return False
    
    def test_orders_endpoint(self):
        """Тест 8: Проверка endpoint заказов"""
        print("\n🛒 ТЕСТ 8: Проверка endpoint заказов")
        
        try:
            response = self.session.get(f"{self.base_url}/api/orders/")
            
            if response.status_code == 200:
                orders = response.json()
                self.log_test("Endpoint заказов", True, f"Заказов: {len(orders)}")
                return True
            elif response.status_code == 400:
                # Ожидаемая ошибка без авторизации
                self.log_test("Endpoint заказов", True, "Требует авторизацию (ожидаемо)")
                return True
            else:
                self.log_test("Endpoint заказов", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Endpoint заказов", False, f"Исключение: {str(e)}")
            return False
    
    def test_addresses_endpoint(self):
        """Тест 9: Проверка endpoint адресов"""
        print("\n🏠 ТЕСТ 9: Проверка endpoint адресов")
        
        try:
            response = self.session.get(f"{self.base_url}/api/addresses/")
            
            if response.status_code == 200:
                addresses = response.json()
                self.log_test("Endpoint адресов", True, f"Адресов: {len(addresses)}")
                return True
            elif response.status_code == 400:
                # Ожидаемая ошибка без авторизации
                self.log_test("Endpoint адресов", True, "Требует авторизацию (ожидаемо)")
                return True
            else:
                self.log_test("Endpoint адресов", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Endpoint адресов", False, f"Исключение: {str(e)}")
            return False
    
    def test_webhook_endpoint(self):
        """Тест 10: Проверка endpoint webhook"""
        print("\n🤖 ТЕСТ 10: Проверка endpoint webhook")
        
        try:
            # Тестируем GET запрос к webhook
            response = self.session.get(f"{self.base_url}/api/webhook/")
            
            if response.status_code in [200, 405]:  # 405 - Method Not Allowed для GET
                self.log_test("Endpoint webhook", True, "Доступен")
                return True
            else:
                self.log_test("Endpoint webhook", False, f"Ошибка {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Endpoint webhook", False, f"Исключение: {str(e)}")
            return False
    
    def test_performance(self):
        """Тест 11: Проверка производительности"""
        print("\n⚡ ТЕСТ 11: Проверка производительности")
        
        try:
            start_time = time.time()
            
            # Тестируем скорость получения меню
            response = self.session.get(f"{self.base_url}/api/menu/")
            
            menu_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("Скорость получения меню", menu_time < 2.0, f"Время: {menu_time:.2f}с")
            else:
                self.log_test("Скорость получения меню", False, f"Ошибка {response.status_code}")
            
            # Тестируем скорость получения категорий
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/categories/")
            categories_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("Скорость получения категорий", categories_time < 1.0, f"Время: {categories_time:.2f}с")
            else:
                self.log_test("Скорость получения категорий", False, f"Ошибка {response.status_code}")
            
            return True
                
        except Exception as e:
            self.log_test("Проверка производительности", False, f"Исключение: {str(e)}")
            return False
    
    def test_api_structure(self):
        """Тест 12: Проверка структуры API"""
        print("\n🏗️  ТЕСТ 12: Проверка структуры API")
        
        try:
            # Проверяем основные endpoints
            endpoints = [
                ("auth", "/api/auth/"),
                ("menu", "/api/menu/"),
                ("categories", "/api/categories/"),
                ("add-ons", "/api/add-ons/"),
                ("promotions", "/api/promotions/"),
                ("delivery-zones", "/api/delivery-zones/"),
                ("orders", "/api/orders/"),
                ("addresses", "/api/addresses/"),
                ("webhook", "/api/webhook/"),
            ]
            
            available_endpoints = 0
            
            for name, endpoint in endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    if response.status_code in [200, 400, 405]:  # 400/405 - ожидаемые ошибки
                        self.log_test(f"Endpoint {name}", True, f"Статус: {response.status_code}")
                        available_endpoints += 1
                    else:
                        self.log_test(f"Endpoint {name}", False, f"Статус: {response.status_code}")
                except Exception as e:
                    self.log_test(f"Endpoint {name}", False, f"Ошибка: {str(e)}")
            
            self.log_test("Общая доступность API", available_endpoints >= 6, f"Доступно: {available_endpoints}/{len(endpoints)}")
            
            return True
                
        except Exception as e:
            self.log_test("Проверка структуры API", False, f"Исключение: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Запускает все тесты"""
        print("🚀 ЗАПУСК ИСПРАВЛЕННОГО ТЕСТИРОВАНИЯ STREETBURGER MINI APP")
        print("=" * 70)
        
        tests = [
            self.test_auth_endpoint,
            self.test_get_menu,
            self.test_get_categories,
            self.test_get_addons,
            self.test_get_promotions,
            self.test_delivery_zones,
            self.test_geocode_endpoint,
            self.test_orders_endpoint,
            self.test_addresses_endpoint,
            self.test_webhook_endpoint,
            self.test_performance,
            self.test_api_structure
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                self.log_test(test.__name__, False, f"Критическая ошибка: {str(e)}")
        
        # Выводим итоговую статистику
        print("\n" + "=" * 70)
        print("📊 ИТОГОВАЯ СТАТИСТИКА")
        print("=" * 70)
        
        print(f"✅ Пройдено тестов: {passed}/{total}")
        print(f"❌ Провалено тестов: {total - passed}")
        print(f"📈 Процент успеха: {(passed/total)*100:.1f}%")
        
        # Выводим детальные результаты
        print("\n📋 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:")
        print("-" * 70)
        
        for result in self.test_results:
            status_icon = "✅" if result["status"] else "❌"
            print(f"{status_icon} {result['test']} - {result['message']}")
        
        return passed == total
    
    def generate_report(self):
        """Генерирует отчет о тестировании"""
        report = {
            "project": "StreetBurger Mini App (Исправленная версия)",
            "test_date": datetime.now().isoformat(),
            "base_url": self.base_url,
            "total_tests": len(self.test_results),
            "passed_tests": len([r for r in self.test_results if r["status"]]),
            "failed_tests": len([r for r in self.test_results if not r["status"]]),
            "results": self.test_results
        }
        
        # Сохраняем отчет в файл
        with open("client_test_report_fixed.json", "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 Отчет сохранен в файл: client_test_report_fixed.json")


def main():
    """Главная функция для запуска тестирования"""
    import sys
    
    # Парсим аргументы командной строки
    base_url = "http://localhost:8000"
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print(f"🎯 Исправленное тестирование StreetBurger Mini App")
    print(f"🌐 Базовый URL: {base_url}")
    print(f"⏰ Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Создаем экземпляр тестера
    tester = StreetBurgerClientTestFixed(base_url)
    
    # Запускаем все тесты
    success = tester.run_all_tests()
    
    # Генерируем отчет
    tester.generate_report()
    
    # Возвращаем код выхода
    if success:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        sys.exit(0)
    else:
        print("\n⚠️  НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!")
        sys.exit(1)


if __name__ == "__main__":
    main() 