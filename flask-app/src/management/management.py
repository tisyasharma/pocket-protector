from flask import Blueprint

management = Blueprint('management', __name__)

from src.management import spending_goals
from src.management import budgets
from src.management import notifications
