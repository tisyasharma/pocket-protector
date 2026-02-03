from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields

from . import purchases

# investment endpoints

@purchases.route('/investments/<user_id>', methods=['GET'])
def get_investments(user_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Investments WHERE user_id = %s', (user_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/investments/<user_id>', methods=['POST'])
def create_investment(user_id):
    try:
        the_data, err = validate_fields(['stock_name', 'purchase_date', 'investment_type'])
        if err:
            return err

        query = 'INSERT INTO Investments (stock_name, purchase_date, investment_type, user_id) VALUES (%s, %s, %s, %s)'
        values = (the_data['stock_name'], the_data['purchase_date'], the_data['investment_type'], user_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Investment created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/investments/detail/<investment_id>', methods=['GET'])
def get_investment(investment_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Investments WHERE investment_id = %s', (investment_id,))
        row = cursor.fetchone()
        if not row:
            return error_response('Investment not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/investments/<investment_id>', methods=['PUT'])
def update_investment(investment_id):
    try:
        the_data, err = validate_fields(['stock_name', 'purchase_date', 'investment_type'])
        if err:
            return err

        query = 'UPDATE Investments SET stock_name = %s, purchase_date = %s, investment_type = %s WHERE investment_id = %s'
        values = (the_data['stock_name'], the_data['purchase_date'], the_data['investment_type'], investment_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Investment updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/investments/<investment_id>', methods=['DELETE'])
def delete_investment(investment_id):
    try:
        query = 'DELETE FROM Investments WHERE investment_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (investment_id,))
        db.get_db().commit()
        return success_response({'message': 'Investment deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
