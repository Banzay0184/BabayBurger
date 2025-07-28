from django.core.cache import cache
import logging

logger = logging.getLogger('api')

def is_redis_available():
    """Проверяет доступность Redis"""
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        redis_conn.ping()
        return True
    except ImportError:
        logger.warning("django-redis not installed, Redis unavailable")
        return False
    except Exception as e:
        logger.warning(f"Redis is not available: {str(e)}")
        return False

def clear_menu_cache():
    """Очищает кэш меню"""
    try:
        if is_redis_available():
            cache.delete('menu_items')
            logger.info("Menu cache cleared successfully")
        else:
            logger.warning("Redis not available, skipping menu cache clear")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

def clear_categories_cache():
    """Очищает кэш категорий"""
    try:
        if is_redis_available():
            cache.delete('categories')
            logger.info("Categories cache cleared successfully")
        else:
            logger.warning("Redis not available, skipping categories cache clear")
    except Exception as e:
        logger.error(f"Error clearing categories cache: {str(e)}")

def clear_all_caches():
    """Очищает все кэши"""
    try:
        if is_redis_available():
            cache.clear()
            logger.info("All caches cleared successfully")
        else:
            logger.warning("Redis not available, skipping cache clear")
    except Exception as e:
        logger.error(f"Error clearing all caches: {str(e)}")

def get_cache_info():
    """Получает информацию о кэше"""
    try:
        if not is_redis_available():
            return {
                'redis_available': False,
                'menu_cached': False,
                'categories_cached': False,
            }
        
        menu_cached = cache.get('menu_items') is not None
        categories_cached = cache.get('categories') is not None
        
        return {
            'redis_available': True,
            'menu_cached': menu_cached,
            'categories_cached': categories_cached,
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {str(e)}")
        return {
            'redis_available': False,
            'menu_cached': False,
            'categories_cached': False,
        } 