"""
StockSense Models Package
Imports all models so they are registered with SQLAlchemy Base.
"""

from models.user import User
from models.product import Product
from models.sales import SalesHistory
from models.forecast import Forecast, ForecastAccuracy
from models.anomaly import Anomaly
from models.alert import Alert
from models.stock_movement import StockMovement
from models.lookup import DiseaseSeason, FestivalCalendar
from models.notification import NotificationPreference

__all__ = [
    "User",
    "Product",
    "SalesHistory",
    "Forecast",
    "ForecastAccuracy",
    "Anomaly",
    "Alert",
    "StockMovement",
    "DiseaseSeason",
    "FestivalCalendar",
    "NotificationPreference",
]
