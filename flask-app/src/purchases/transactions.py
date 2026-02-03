from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields

from . import purchases

# transaction endpoints

@purchases.route('/transactions/<receipt_id>', methods=['GET'])
def get_transactions(receipt_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Transactions WHERE receipt_id = %s', (receipt_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/transactions/<receipt_id>', methods=['POST'])
def create_transaction(receipt_id):
    try:
        the_data, err = validate_fields(['unit_cost', 'quantity', 'item_name'])
        if err:
            return err

        query = 'INSERT INTO Transactions (unit_cost, quantity, item_name, receipt_id) VALUES (%s, %s, %s, %s)'
        values = (the_data['unit_cost'], the_data['quantity'], the_data['item_name'], receipt_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Transaction created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/transactions/detail/<transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Transactions WHERE transaction_id = %s', (transaction_id,))
        row = cursor.fetchone()
        if not row:
            return error_response('Transaction not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/transactions/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    try:
        query = 'DELETE FROM Transactions WHERE transaction_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (transaction_id,))
        db.get_db().commit()
        return success_response({'message': 'Transaction deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
