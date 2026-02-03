from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields
from src.users.users import users

# group endpoints

@users.route('/group-members/<group_id>', methods=['GET'])
def get_users_from_group(group_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute(
            'SELECT user_id, group_id, email, first_name, middle_name, last_name FROM Users WHERE group_id = %s',
            (group_id,)
        )
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@users.route('/group/<group_id>', methods=['PUT'])
def update_group(group_id):
    try:
        the_data, err = validate_fields(['group_name', 'admin_user_id'])
        if err:
            return err

        query = 'UPDATE `Groups` SET group_name = %s, admin_user_id = %s WHERE group_id = %s'
        values = (the_data['group_name'], the_data['admin_user_id'], group_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Group updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@users.route('/group/<admin_user_id>', methods=['POST'])
def create_group(admin_user_id):
    try:
        the_data, err = validate_fields(['group_name'])
        if err:
            return err

        query = 'INSERT INTO `Groups` (group_name, admin_user_id) VALUES (%s, %s)'
        values = (the_data['group_name'], admin_user_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Group created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)
