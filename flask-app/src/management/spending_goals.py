from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields
from src.management.management import management

@management.route('/spending-goals/<user_id>', methods=['GET'])
def get_spending_goals(user_id):
    """
    Return all spending goals for a user, with actual spending filled in.
    Joins against Receipts grouped by month to calculate current_amount.
    """
    try:
        cursor = db.get_db().cursor()
        cursor.execute('''
            SELECT sg.goal_id, sg.target_amount, sg.Month, sg.user_id,
                   COALESCE(r.total, 0) as current_amount,
                   (SELECT MAX(YEAR(date)) FROM Receipts) as data_year
            FROM Spending_goals sg
            LEFT JOIN (
                SELECT user_id,
                       MONTHNAME(date) as month_name,
                       SUM(total_amount) as total
                FROM Receipts
                WHERE YEAR(date) = (
                    SELECT MAX(YEAR(date)) FROM Receipts
                )
                GROUP BY user_id, MONTHNAME(date)
            ) r ON r.user_id = sg.user_id AND r.month_name = sg.Month
            WHERE sg.user_id = %s
        ''', (user_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/spending-goals/<user_id>', methods=['POST'])
def create_spending_goal(user_id):
    """Create a new monthly spending goal for this user."""
    try:
        the_data, err = validate_fields(['current_amount', 'target_amount', 'month'])
        if err:
            return err

        query = 'INSERT INTO Spending_goals (current_amount, target_amount, Month, user_id) VALUES (%s, %s, %s, %s)'
        values = (the_data['current_amount'], the_data['target_amount'], the_data['month'], user_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Spending goal created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/spending-goals/goal/<goal_id>', methods=['GET'])
def get_spending_goal(goal_id):
    """Fetch a single spending goal by its primary key."""
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Spending_goals WHERE goal_id = %s', (goal_id,))
        row = cursor.fetchone()
        if not row:
            return error_response('Spending goal not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/spending-goals/<goal_id>', methods=['PUT'])
def update_spending_goal(goal_id):
    """Update the target amount or month for a goal."""
    try:
        the_data, err = validate_fields(['current_amount', 'target_amount', 'month'])
        if err:
            return err

        query = 'UPDATE Spending_goals SET current_amount = %s, target_amount = %s, Month = %s WHERE goal_id = %s'
        values = (the_data['current_amount'], the_data['target_amount'], the_data['month'], goal_id)
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Spending goal updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/spending-goals/<goal_id>', methods=['DELETE'])
def delete_spending_goal(goal_id):
    """Remove a spending goal."""
    try:
        query = 'DELETE FROM Spending_goals WHERE goal_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (goal_id,))
        db.get_db().commit()
        return success_response({'message': 'Spending goal deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
