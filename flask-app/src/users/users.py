from flask import Blueprint

users = Blueprint('users', __name__)

from src.users import accounts
from src.users import groups
from src.users import auth
