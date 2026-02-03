from src import db
from src.helpers import build_json_response, success_response, error_response, validate_fields
from src.management.management import management

@management.route('/budgets/<category_id>', methods=['GET'])
def get_budget_of_category(category_id):
    """Fetch all budgets tied to a specific category."""
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Budgets WHERE category_id = %s', (category_id,))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/budgets/<category_id>', methods=['POST'])
def create_budget(category_id):
    """Create a new budget for a category with a date range."""
    try:
        the_data, err = validate_fields(
            ['amount', 'start_date', 'end_date', 'user_id']
        )
        if err:
            return err

        query = (
            'INSERT INTO Budgets '
            '(amount, start_date, end_date, category_id, user_id) '
            'VALUES (%s, %s, %s, %s, %s)'
        )
        values = (
            the_data['amount'], the_data['start_date'],
            the_data['end_date'], category_id, the_data['user_id']
        )
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Budget created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/budgets/<budget_id>', methods=['PUT'])
def update_budget(budget_id):
    """Update a budget's amount, dates, or notification threshold."""
    try:
        the_data, err = validate_fields(
            ['amount', 'start_date', 'end_date', 'notification_threshold']
        )
        if err:
            return err

        query = (
            'UPDATE Budgets SET amount = %s, start_date = %s, '
            'end_date = %s, notification_threshold = %s '
            'WHERE budget_id = %s'
        )
        values = (
            the_data['amount'], the_data['start_date'],
            the_data['end_date'], the_data['notification_threshold'],
            budget_id
        )
        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Budget updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/budgets/<budget_id>', methods=['DELETE'])
def delete_budget(budget_id):
    """Remove a budget by ID."""
    try:
        query = 'DELETE FROM Budgets WHERE budget_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (budget_id,))
        db.get_db().commit()
        return success_response({'message': 'Budget deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@management.route('/budgets/user/<user_id>', methods=['GET'])
def get_all_budgets_from_user(user_id):
    """
    Returns budgets with category name + spending inside the budget period.
    ?active=true filters to budgets that are active today.
    """
    try:
        from flask import request
        active_only = request.args.get('active', '').lower() == 'true'
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        cursor = db.get_db().cursor()

        if start_date and end_date:
            active_filter = 'AND b.start_date <= %s AND b.end_date >= %s'
            extra_params = [end_date, start_date]
        elif active_only:
            active_filter = 'AND CURRENT_DATE BETWEEN b.start_date AND b.end_date'
            extra_params = []
        else:
            active_filter = ''
            extra_params = []

        cursor.execute(f'''
            SELECT b.budget_id, b.amount, b.start_date, b.end_date,
                   b.notification_threshold, b.category_id, b.user_id,
                   c.category_name,
                   COALESCE(spent.total, 0) as spent_amount
            FROM Budgets b
            LEFT JOIN Categories c ON b.category_id = c.category_id
            LEFT JOIN (
                SELECT r.category_id, r.user_id, b2.budget_id, SUM(r.total_amount) as total
                FROM Receipts r
                JOIN Budgets b2 ON r.category_id = b2.category_id
                    AND r.user_id = b2.user_id
                    AND r.date BETWEEN b2.start_date AND b2.end_date
                GROUP BY r.category_id, r.user_id, b2.budget_id
            ) spent ON spent.budget_id = b.budget_id
            WHERE b.user_id = %s {active_filter}
            ORDER BY b.start_date DESC
        ''', [user_id] + extra_params)
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)
