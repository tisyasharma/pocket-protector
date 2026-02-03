from flask import Blueprint

management = Blueprint('management', __name__)

# pull in route files so the blueprint gets all endpoints
from src.management import spending_goals
from src.management import budgets
from src.management import notifications
