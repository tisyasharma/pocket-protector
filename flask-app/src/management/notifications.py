from src import db
from src.helpers import build_json_response, success_response, error_response
from src.management.management import management

# notification endpoints

@management.route('/budgets/notifications/<user_id>', methods=['GET'])
def get_all_notifications_from_user(user_id):
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Notifications WHERE user_id = %s', (user_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)
