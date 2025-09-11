import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder
from .models import Operator
from api.models import Order
from .serializers import OrderForOperatorSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class OperatorConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer для операторов"""
    
    async def connect(self):
        """Подключение к WebSocket"""
        self.operator_id = self.scope['url_route']['kwargs'].get('operator_id')
        self.operator_group_name = f'operator_{self.operator_id}' if self.operator_id else 'operators'
        
        # Присоединяемся к группе операторов
        await self.channel_layer.group_add(
            self.operator_group_name,
            self.channel_name
        )
        
        # Также присоединяемся к общей группе всех операторов
        await self.channel_layer.group_add(
            'operators',
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Operator WebSocket connected: {self.operator_group_name}")
        
        # Отправляем приветственное сообщение
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket соединение установлено',
            'operator_group': self.operator_group_name
        }))

    async def disconnect(self, close_code):
        """Отключение от WebSocket"""
        # Покидаем группы
        await self.channel_layer.group_discard(
            self.operator_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            'operators',
            self.channel_name
        )
        
        logger.info(f"Operator WebSocket disconnected: {self.operator_group_name}")

    async def receive(self, text_data):
        """Получение сообщения от клиента"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Отвечаем на ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe_orders':
                # Подписка на обновления заказов
                await self.channel_layer.group_add(
                    'order_updates',
                    self.channel_name
                )
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'message': 'Подписка на обновления заказов активирована'
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")

    # Обработчики для различных типов сообщений
    async def order_created(self, event):
        """Новый заказ создан"""
        logger.info(f"📨 WebSocket consumer: sending order_created event for order #{event.get('order', {}).get('id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'order_created',
            'order': event['order'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_updated(self, event):
        """Заказ обновлен"""
        await self.send(text_data=json.dumps({
            'type': 'order_updated',
            'order_id': event['order_id'],
            'order': event.get('order'),
            'status': event.get('status'),
            'updated_at': event.get('updated_at'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_assigned(self, event):
        """Заказ назначен оператору"""
        await self.send(text_data=json.dumps({
            'type': 'order_assigned',
            'order_id': event['order_id'],
            'operator_id': event['operator_id'],
            'operator_name': event.get('operator_name'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def notification(self, event):
        """Новое уведомление"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def dashboard_update(self, event):
        """Обновление дашборда"""
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'stats': event.get('stats'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))


class OrderConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer для отслеживания конкретного заказа"""
    
    async def connect(self):
        """Подключение к WebSocket для конкретного заказа"""
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.order_group_name = f'order_{self.order_id}'
        
        # Проверяем, существует ли заказ
        order_exists = await self.check_order_exists(self.order_id)
        if not order_exists:
            await self.close()
            return
        
        # Присоединяемся к группе заказа
        await self.channel_layer.group_add(
            self.order_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Order WebSocket connected: {self.order_group_name}")

    async def disconnect(self, close_code):
        """Отключение от WebSocket"""
        await self.channel_layer.group_discard(
            self.order_group_name,
            self.channel_name
        )
        
        logger.info(f"Order WebSocket disconnected: {self.order_group_name}")

    async def receive(self, text_data):
        """Получение сообщения от клиента"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")

    async def order_status_update(self, event):
        """Обновление статуса заказа"""
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'order_id': event['order_id'],
            'status': event['status'],
            'status_display': event.get('status_display'),
            'updated_at': event.get('updated_at'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_details_update(self, event):
        """Обновление деталей заказа"""
        await self.send(text_data=json.dumps({
            'type': 'order_details_update',
            'order': event['order'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    @database_sync_to_async
    def check_order_exists(self, order_id):
        """Проверка существования заказа"""
        try:
            Order.objects.get(id=order_id)
            return True
        except Order.DoesNotExist:
            return False


class ClientConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer для клиентов (по telegram_id)"""
    
    async def connect(self):
        """Подключение к WebSocket для клиента"""
        self.telegram_id = self.scope['url_route']['kwargs'].get('telegram_id')
        
        # Проверяем, что telegram_id предоставлен
        if not self.telegram_id:
            logger.error("Client WebSocket connection rejected: no telegram_id provided")
            await self.close()
            return
            
        self.client_group_name = f'client_{self.telegram_id}'
        
        # Присоединяемся к группе клиента
        await self.channel_layer.group_add(
            self.client_group_name,
            self.channel_name
        )
        
        # Также присоединяемся к группе обновлений меню
        await self.channel_layer.group_add(
            'menu_updates',
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Client WebSocket connected: {self.client_group_name}")
        
        # Отправляем подтверждение подключения
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket соединение установлено',
            'client_group': self.client_group_name
        }))

    async def disconnect(self, close_code):
        """Отключение от WebSocket"""
        await self.channel_layer.group_discard(
            self.client_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            'menu_updates',
            self.channel_name
        )
        
        logger.info(f"Client WebSocket disconnected: {self.client_group_name}")

    async def receive(self, text_data):
        """Получение сообщения от клиента"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe_user_orders':
                # Подписываемся на все заказы пользователя
                telegram_id = text_data_json.get('telegram_id')
                if telegram_id:
                    await self.channel_layer.group_add(
                        f'client_{telegram_id}',
                        self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'subscribed',
                        'message': 'Subscribed to user orders'
                    }))
            elif message_type == 'subscribe_order':
                # Подписываемся на конкретный заказ
                order_id = text_data_json.get('order_id')
                if order_id:
                    await self.channel_layer.group_add(
                        f'order_{order_id}',
                        self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'subscribed',
                        'message': f'Subscribed to order {order_id}'
                    }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")

    async def order_status_update(self, event):
        """Обновление статуса заказа"""
        logger.info(f"📨 Client WebSocket: sending order_status_update for order #{event.get('order_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'order_id': event['order_id'],
            'status': event['status'],
            'status_display': event.get('status_display'),
            'updated_at': event.get('updated_at'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_details_update(self, event):
        """Обновление деталей заказа"""
        logger.info(f"📨 Client WebSocket: sending order_details_update for order #{event.get('order', {}).get('id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'order_details_update',
            'order': event['order'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def menu_item_updated(self, event):
        """Обновление элемента меню"""
        logger.info(f"📨 Client WebSocket: sending menu_item_updated for item #{event.get('item_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'menu_item_updated',
            'item_id': event['item_id'],
            'item_name': event['item_name'],
            'is_active': event['is_active'],
            'action': event['action'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def addon_updated(self, event):
        """Обновление дополнения"""
        logger.info(f"📨 Client WebSocket: sending addon_updated for addon #{event.get('addon_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'addon_updated',
            'addon_id': event['addon_id'],
            'addon_name': event['addon_name'],
            'is_active': event['is_active'],
            'action': event['action'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def size_updated(self, event):
        """Обновление размера"""
        logger.info(f"📨 Client WebSocket: sending size_updated for size #{event.get('size_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'size_updated',
            'size_id': event['size_id'],
            'size_name': event['size_name'],
            'is_active': event['is_active'],
            'action': event['action'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def menu_refresh_required(self, event):
        """Требуется обновление меню"""
        logger.info(f"📨 Client WebSocket: sending menu_refresh_required - {event.get('reason', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'menu_refresh_required',
            'reason': event['reason'],
            'addon_name': event.get('addon_name'),
            'size_name': event.get('size_name'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))


class CashierConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer для кассиров"""
    
    async def connect(self):
        """Подключение к WebSocket для кассиров"""
        self.cashier_id = self.scope['url_route']['kwargs'].get('cashier_id')
        self.cashier_group_name = f'cashier_{self.cashier_id}' if self.cashier_id else 'cashiers'
        
        # Присоединяемся к группе кассиров
        await self.channel_layer.group_add(
            self.cashier_group_name,
            self.channel_name
        )
        
        # Также присоединяемся к общей группе всех кассиров
        await self.channel_layer.group_add(
            'cashiers',
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Cashier WebSocket connected: {self.cashier_group_name}")
        
        # Отправляем приветственное сообщение
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket соединение установлено',
            'cashier_group': self.cashier_group_name
        }))

    async def disconnect(self, close_code):
        """Отключение от WebSocket"""
        # Покидаем группы
        await self.channel_layer.group_discard(
            self.cashier_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            'cashiers',
            self.channel_name
        )
        
        logger.info(f"Cashier WebSocket disconnected: {self.cashier_group_name}")

    async def receive(self, text_data):
        """Получение сообщения от клиента"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Отвечаем на ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe_orders':
                # Подписка на обновления заказов
                await self.channel_layer.group_add(
                    'cashier_order_updates',
                    self.channel_name
                )
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'message': 'Подписка на обновления заказов кассира активирована'
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")

    # Обработчики для различных типов сообщений
    async def order_created(self, event):
        """Новый заказ создан для кассира"""
        logger.info(f"📨 Cashier WebSocket: sending order_created event for order #{event.get('order', {}).get('id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'order_created',
            'order': event['order'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_updated(self, event):
        """Заказ обновлен"""
        await self.send(text_data=json.dumps({
            'type': 'order_updated',
            'order_id': event['order_id'],
            'order': event.get('order'),
            'status': event.get('status'),
            'updated_at': event.get('updated_at'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_status_changed(self, event):
        """Статус заказа изменен"""
        await self.send(text_data=json.dumps({
            'type': 'order_status_changed',
            'order_id': event['order_id'],
            'status': event['status'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def dashboard_update(self, event):
        """Обновление дашборда кассира"""
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'stats': event.get('stats'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_confirmed(self, event):
        """Заказ подтвержден оператором и отправлен кассиру"""
        await self.send(text_data=json.dumps({
            'type': 'order_confirmed',
            'order': event['order'],
            'operator_name': event.get('operator_name'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_cancelled(self, event):
        """Заказ отменен"""
        await self.send(text_data=json.dumps({
            'type': 'order_cancelled',
            'order_id': event['order_id'],
            'reason': event.get('reason'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def order_ready(self, event):
        """Заказ готов"""
        await self.send(text_data=json.dumps({
            'type': 'order_ready',
            'order_id': event['order_id'],
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def addon_updated(self, event):
        """Дополнение обновлено"""
        logger.info(f"➕ Cashier WebSocket: sending addon_updated event for addon #{event.get('addon_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'addon_updated',
            'addon_id': event.get('addon_id'),
            'addon_name': event.get('addon_name'),
            'addon_is_active': event.get('addon_is_active'),
            'addon_action': event.get('addon_action'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))

    async def size_updated(self, event):
        """Размер обновлен"""
        logger.info(f"📏 Cashier WebSocket: sending size_updated event for size #{event.get('size_id', 'unknown')}")
        await self.send(text_data=json.dumps({
            'type': 'size_updated',
            'size_id': event.get('size_id'),
            'size_name': event.get('size_name'),
            'size_is_active': event.get('size_is_active'),
            'size_action': event.get('size_action'),
            'timestamp': event.get('timestamp')
        }, cls=DjangoJSONEncoder))
