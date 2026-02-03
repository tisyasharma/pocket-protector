from flask import Blueprint, request
from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields

descriptors = Blueprint('descriptors', __name__)

# category endpoints

@descriptors.route('/categories', methods=['GET'])
def get_all_categories():
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Categories')
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@descriptors.route('/categories/<category_id>', methods=['GET'])
def get_category(category_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Categories WHERE category_id = %s', (category_id,))
        data = build_json_response(cursor, cursor.fetchall())
        if not data:
            return error_response('Category not found', 404)
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


# tag endpoints

@descriptors.route('/tags/<user_id>', methods=['GET'])
def get_all_tags(user_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Tags WHERE user_id = %s', (user_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@descriptors.route('/tags/<user_id>', methods=['POST'])
def create_tag(user_id):
    try:
        the_data, err = validate_fields(['tag_name'])
        if err:
            return err

        tag_name = the_data['tag_name']
        query = 'INSERT INTO Tags (tag_name, user_id) VALUES (%s, %s)'
        cursor = db.get_db().cursor()
        cursor.execute(query, (tag_name, user_id))
        db.get_db().commit()
        return success_response({'message': 'Tag created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@descriptors.route('/tags/<tag_id>', methods=['PUT'])
def update_tag(tag_id):
    try:
        the_data, err = validate_fields(['tag_name'])
        if err:
            return err

        tag_name = the_data['tag_name']
        query = 'UPDATE Tags SET tag_name = %s WHERE tag_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (tag_name, tag_id))
        db.get_db().commit()
        return success_response({'message': 'Tag updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@descriptors.route('/tags/<tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    try:
        query = 'DELETE FROM Tags WHERE tag_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (tag_id,))
        db.get_db().commit()
        return success_response({'message': 'Tag deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
