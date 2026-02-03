from werkzeug.security import generate_password_hash
from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields
from src.users.users import users

# user account endpoints

@users.route('', methods=['GET'])
def get_users():
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT user_id, group_id, email, first_name, middle_name, last_name FROM Users')
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@users.route('', methods=['POST'])
def create_user():
    try:
        the_data, err = validate_fields(['email', 'first_name', 'last_name', 'password'])
        if err:
            return err

        hashed_pw = generate_password_hash(the_data['password'])
        query = 'INSERT INTO Users (group_id, email, first_name, middle_name, last_name, password) VALUES (%s, %s, %s, %s, %s, %s)'
        values = (
            the_data.get('group_id'),
            the_data['email'],
            the_data['first_name'],
            the_data.get('middle_name'),
            the_data['last_name'],
            hashed_pw
        )
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'User created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@users.route('/<user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        the_data, err = validate_fields(['group_id', 'email', 'first_name', 'last_name', 'password'])
        if err:
            return err

        hashed_pw = generate_password_hash(the_data['password'])
        query = 'UPDATE Users SET group_id=%s, email=%s, first_name=%s, middle_name=%s, last_name=%s, password=%s WHERE user_id=%s'
        values = (
            the_data['group_id'],
            the_data['email'],
            the_data['first_name'],
            the_data.get('middle_name'),
            the_data['last_name'],
            hashed_pw,
            user_id
        )
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'User updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@users.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute(
            'SELECT user_id, group_id, email, first_name, middle_name, last_name FROM Users WHERE user_id = %s',
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return error_response('User not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@users.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        query = 'DELETE FROM Users WHERE user_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (user_id,))
        db.get_db().commit()
        return success_response({'message': 'User deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
