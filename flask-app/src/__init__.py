import os
import ssl

import pymysql
from flask import Flask, g
from flask_cors import CORS


class MySQL:
    """Lightweight pymysql wrapper that mirrors the flask-mysql get_db() interface."""

    def __init__(self):
        self._app = None

    def init_app(self, app):
        self._app = app
        app.teardown_appcontext(self._teardown)

    def _connect(self):
        kwargs = {
            'host': self._app.config['DB_HOST'],
            'port': self._app.config['DB_PORT'],
            'user': self._app.config['DB_USER'],
            'password': self._app.config['DB_PASSWORD'],
            'database': self._app.config['DB_NAME'],
        }

        if self._app.config.get('DB_SSL'):
            ctx = ssl.create_default_context()
            kwargs['ssl'] = ctx

        return pymysql.connect(**kwargs)

    def get_db(self):
        if 'db_conn' not in g:
            g.db_conn = self._connect()
        return g.db_conn

    def _teardown(self, _exc):
        conn = g.pop('db_conn', None)
        if conn is not None:
            conn.close()


db = MySQL()


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['DB_HOST'] = os.environ.get('DB_HOST', 'db')
    app.config['DB_PORT'] = int(os.environ.get('DB_PORT', 3306))
    app.config['DB_USER'] = os.environ.get('DB_USER', 'root')
    app.config['DB_NAME'] = os.environ.get('DB_NAME', 'FinanceAppDatabase')
    app.config['DB_SSL'] = os.environ.get('DB_SSL', '').lower() == 'true'

    pw_file = os.environ.get('DB_PASSWORD_FILE', '/secrets/db_root_password.txt')
    if os.environ.get('DB_PASSWORD'):
        app.config['DB_PASSWORD'] = os.environ['DB_PASSWORD']
    elif os.path.exists(pw_file):
        with open(pw_file) as f:
            app.config['DB_PASSWORD'] = f.readline().strip()
    else:
        app.config['DB_PASSWORD'] = ''

    db.init_app(app)
    CORS(app)

    @app.route("/")
    def welcome():
        return "<h1>Pocket Protectors API</h1>"

    from src.descriptors.categories import descriptors
    from src.management.management import management
    from src.purchases import purchases
    from src.users.users import users

    app.register_blueprint(descriptors, url_prefix='/descriptors')
    app.register_blueprint(management, url_prefix='/management')
    app.register_blueprint(purchases, url_prefix='/purchases')
    app.register_blueprint(users, url_prefix='/users')

    return app
