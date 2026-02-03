from werkzeug.security import check_password_hash
from src import db
from src.helpers import success_response, error_response, validate_fields
from src.users.users import users

# login endpoint

@users.route('/login', methods=['POST'])
def login():
    """Checks email/password and returns the user if it matches."""
    try:
        the_data, err = validate_fields(['email', 'password'])
        if err:
            return err

        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Users WHERE email = %s', (the_data['email'],))
        row = cursor.fetchone()

        if not row:
            return error_response('Invalid email or password', 401)

        row_headers = [x[0] for x in cursor.description]
        user = dict(zip(row_headers, row))

        if not check_password_hash(user['password'], the_data['password']):
            return error_response('Invalid email or password', 401)

        user.pop('password', None)
        return success_response(user)
    except Exception as e:
        return error_response(str(e), 500)
