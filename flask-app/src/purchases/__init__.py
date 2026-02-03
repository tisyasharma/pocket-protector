from flask import Blueprint

purchases = Blueprint('purchases', __name__)

from . import receipts
from . import transactions
from . import stores
