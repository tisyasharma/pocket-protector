from flask import request

from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields

from . import purchases

# store endpoints

@purchases.route('/stores', methods=['GET'])
def get_stores():
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Stores')
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/stores/search', methods=['GET'])
def search_stores():
    """Returns stores matching the query (max 8)."""
    try:
        q = request.args.get('q', '').strip()
        if len(q) < 1:
            return success_response([])
        cursor = db.get_db().cursor()
        cursor.execute(
            'SELECT MIN(store_id) as store_id, store_name FROM Stores WHERE store_name LIKE %s GROUP BY store_name LIMIT 8',
            (f'%{q}%',)
        )
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/stores', methods=['POST'])
def create_store():
    try:
        the_data, err = validate_fields(['store_name', 'zip_code', 'street_address', 'city', 'state'])
        if err:
            return err

        query = 'INSERT INTO Stores (store_name, zip_code, street_address, city, state) VALUES (%s, %s, %s, %s, %s)'
        values = (the_data['store_name'], the_data['zip_code'], the_data['street_address'], the_data['city'], the_data['state'])
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Store created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/stores/<store_id>', methods=['GET'])
def get_store(store_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Stores WHERE store_id = %s', (store_id,))
        row = cursor.fetchone()
        if not row:
            return error_response('Store not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/stores/<store_id>', methods=['PUT'])
def update_store(store_id):
    try:
        the_data, err = validate_fields(['store_name', 'zip_code', 'street_address', 'city', 'state'])
        if err:
            return err

        query = 'UPDATE Stores SET store_name = %s, zip_code = %s, street_address = %s, city = %s, state = %s WHERE store_id = %s'
        values = (
            the_data['store_name'],
            the_data['zip_code'],
            the_data['street_address'],
            the_data['city'],
            the_data['state'],
            store_id
        )
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Store updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/stores/<store_id>', methods=['DELETE'])
def delete_store(store_id):
    try:
        query = 'DELETE FROM Stores WHERE store_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (store_id,))
        db.get_db().commit()
        return success_response({'message': 'Store deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
