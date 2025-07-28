import logging
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger('api')

def validate_webhook_data(data: Any) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Валидирует данные webhook от Telegram
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict]]: (is_valid, error_message, parsed_data)
    """
    if not data:
        return False, "Empty request data", None
    
    if not isinstance(data, dict):
        return False, f"Invalid data type: {type(data)}", None
    
    message = data.get('message')
    if not message:
        return False, "No message in update", None
    
    if not isinstance(message, dict):
        return False, f"Invalid message type: {type(message)}", None
    
    chat = message.get('chat')
    if not chat:
        return False, "No chat in message", None
    
    if not isinstance(chat, dict):
        return False, f"Invalid chat type: {type(chat)}", None
    
    chat_id = chat.get('id')
    if chat_id is None:
        return False, "Invalid chat_id", None
    
    if not isinstance(chat_id, (int, str)):
        return False, f"Invalid chat_id type: {type(chat_id)}", None
    
    text = message.get('text', '')
    
    parsed_data = {
        'chat_id': chat_id,
        'text': text,
        'message': message,
        'chat': chat
    }
    
    return True, None, parsed_data

def validate_auth_data(data: Any) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Валидирует данные аутентификации
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict]]: (is_valid, error_message, parsed_data)
    """
    if not data:
        return False, "No data provided", None
    
    init_data = data.get('initData')
    if not init_data:
        return False, "No initData provided", None
    
    if not isinstance(init_data, dict):
        return False, f"Invalid initData type: {type(init_data)}", None
    
    user_data = init_data.get('user')
    if not user_data:
        return False, "No user data in initData", None
    
    if not isinstance(user_data, dict):
        return False, f"Invalid user data type: {type(user_data)}", None
    
    telegram_id = user_data.get('id')
    if not telegram_id:
        return False, "No telegram_id in user data", None
    
    parsed_data = {
        'telegram_id': telegram_id,
        'username': user_data.get('username'),
        'first_name': user_data.get('first_name'),
        'init_data': init_data
    }
    
    return True, None, parsed_data

def validate_order_data(data: Any) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Валидирует данные заказа
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict]]: (is_valid, error_message, parsed_data)
    """
    if not data:
        return False, "No data provided", None
    
    telegram_id = data.get('telegram_id')
    if not telegram_id:
        return False, "telegram_id is required", None
    
    items_data = data.get('items')
    if not items_data:
        return False, "items are required", None
    
    if not isinstance(items_data, list):
        return False, f"items must be a list, got {type(items_data)}", None
    
    if not items_data:
        return False, "items list cannot be empty", None
    
    address = data.get('address')
    if not address:
        return False, "address is required", None
    
    # Валидируем каждый товар
    for i, item_data in enumerate(items_data):
        if not isinstance(item_data, dict):
            return False, f"Invalid item data type at index {i}: {type(item_data)}", None
        
        menu_item_id = item_data.get('menu_item_id')
        if not menu_item_id:
            return False, f"menu_item_id is required at index {i}", None
        
        quantity = item_data.get('quantity')
        if not quantity or quantity <= 0:
            return False, f"quantity must be positive at index {i}, got {quantity}", None
    
    parsed_data = {
        'telegram_id': telegram_id,
        'items': items_data,
        'address': address
    }
    
    return True, None, parsed_data

def validate_address_data(data: Any) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Валидирует данные адреса
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict]]: (is_valid, error_message, parsed_data)
    """
    if not data:
        return False, "No data provided", None
    
    telegram_id = data.get('telegram_id')
    if not telegram_id:
        return False, "telegram_id is required", None
    
    address = data.get('address')
    if not address:
        return False, "address is required", None
    
    phone_number = data.get('phone_number')
    if not phone_number:
        return False, "phone_number is required", None
    
    parsed_data = {
        'telegram_id': telegram_id,
        'address': address,
        'phone_number': phone_number
    }
    
    return True, None, parsed_data 