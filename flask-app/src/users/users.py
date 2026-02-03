from flask import Blueprint

users = Blueprint('users', __name__)

# pull in route files so the blueprint gets all endpoints
from src.users import accounts
from src.users import groups
from src.users import auth
