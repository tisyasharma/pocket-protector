import os
from flask import Flask
from flaskext.mysql import MySQL
from flask_cors import CORS

db = MySQL()


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['MYSQL_DATABASE_USER'] = os.environ.get('MYSQLUSER', os.environ.get('DB_USER', 'root'))
    app.config['MYSQL_DATABASE_HOST'] = os.environ.get('MYSQLHOST', os.environ.get('DB_HOST', 'db'))
    app.config['MYSQL_DATABASE_PORT'] = int(os.environ.get('MYSQLPORT', os.environ.get('DB_PORT', 3306)))
    app.config['MYSQL_DATABASE_DB'] = os.environ.get('MYSQLDATABASE', os.environ.get('DB_NAME', 'FinanceAppDatabase'))

    railway_pw = os.environ.get('MYSQLPASSWORD')
    if railway_pw:
        app.config['MYSQL_DATABASE_PASSWORD'] = railway_pw
    else:
        pw_file = os.environ.get('DB_PASSWORD_FILE', '/secrets/db_root_password.txt')
        if os.path.exists(pw_file):
            with open(pw_file) as f:
                app.config['MYSQL_DATABASE_PASSWORD'] = f.readline().strip()
        else:
            app.config['MYSQL_DATABASE_PASSWORD'] = os.environ.get('DB_PASSWORD', '')

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
