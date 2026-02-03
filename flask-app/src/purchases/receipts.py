from flask import request

from src import db
from src.helpers import (
    build_json_response, success_response,
    error_response, validate_fields
)
from src.ml.categorizer import (
    predict_category, CONFIDENCE_THRESHOLD,
    train_model, reset_model
)

from . import purchases

KNOWN_MERCHANTS = {
    'trader joe': 'Food & Drink',
    'whole foods': 'Food & Drink',
    'stop shop': 'Food & Drink',
    'starbucks': 'Food & Drink',
    'dunkin': 'Food & Drink',
    'panera': 'Food & Drink',
    'chipotle': 'Food & Drink',
    'mcdonald': 'Food & Drink',
    'sweetgreen': 'Food & Drink',
    'subway': 'Food & Drink',
    'amazon': 'Shopping',
    'target': 'Shopping',
    'walmart': 'Shopping',
    'costco': 'Shopping',
    'best buy': 'Shopping',
    'urban outfitter': 'Shopping',
    'uniqlo': 'Shopping',
    'nike': 'Shopping',
    'sephora': 'Shopping',
    'home depot': 'Shopping',
    'amc': 'Entertainment',
    'netflix': 'Entertainment',
    'spotify': 'Entertainment',
    'shell': 'Transportation',
    'exxon': 'Transportation',
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'cvs': 'Health',
    'walgreens': 'Health',
    'planet fitness': 'Health',
    'equinox': 'Health',
    'marriott': 'Travel',
    'airbnb': 'Travel',
    'delta': 'Travel',
    'jetblue': 'Travel',
    'hilton': 'Travel',
    'comcast': 'Services',
    'xfinity': 'Services',
    'verizon': 'Services',
    'national grid': 'Services',
}

SUBSCRIPTION_MERCHANTS = {
    'netflix', 'spotify', 'hulu', 'disney+',
    'planet fitness', 'equinox', 'boston sports club', 'cambridge athletic',
    'comcast', 'xfinity', 'verizon', 'national grid',
    'blue cross', 'bright horizons',
}


def is_subscription_merchant(store_name):
    """Check if a store name matches a known subscription or recurring service."""
    name_lower = store_name.lower().strip()
    return any(keyword in name_lower for keyword in SUBSCRIPTION_MERCHANTS)


CATEGORY_SIGNALS = {
    'Food & Drink': {
        'strong': ['restaurant', 'cafe', 'coffee', 'bakery', 'pizzeria', 'grocer', 'market'],
        'moderate': ['pizza', 'sushi', 'grill', 'kitchen', 'diner', 'bar', 'pub', 'seafood', 'deli'],
    },
    'Shopping': {
        'strong': ['mall', 'outlet', 'department store', 'boutique'],
        'moderate': ['shop', 'store', 'fashion', 'book', 'sport', 'tech', 'pet'],
    },
    'Entertainment': {
        'strong': ['cinema', 'theater', 'theatre', 'stadium', 'arena'],
        'moderate': ['movie', 'concert', 'ticket', 'arcade', 'museum', 'music'],
    },
    'Transportation': {
        'strong': ['gas station', 'fuel', 'auto repair', 'transit authority'],
        'moderate': ['gas', 'parking', 'metro', 'transit', 'taxi', 'auto'],
    },
    'Health': {
        'strong': ['pharmacy', 'hospital', 'clinic', 'medical center', 'dental'],
        'moderate': ['health', 'fitness', 'gym', 'yoga', 'athletic', 'wellness', 'vitamin'],
    },
    'Travel': {
        'strong': ['hotel', 'resort', 'airline', 'airways'],
        'moderate': ['travel', 'flight', 'booking', 'rental car', 'cruise'],
    },
    'Services': {
        'strong': ['utility', 'insurance', 'electric company'],
        'moderate': ['internet', 'cable', 'electric', 'daycare', 'school', 'salon'],
    },
}


def categorize_store(store_name):
    """
    Categorize a store by checking known merchants first, then scoring
    against keyword signals, falling back to ML prediction when confident,
    and defaulting to Shopping otherwise. Returns (category, source).
    """
    name_lower = store_name.lower().strip()

    for merchant, category in KNOWN_MERCHANTS.items():
        if merchant in name_lower:
            return category, 'merchant_rule'

    scores = {cat: 0 for cat in CATEGORY_SIGNALS}
    for category, signals in CATEGORY_SIGNALS.items():
        for keyword in signals['strong']:
            if keyword in name_lower:
                scores[category] += 3
        for keyword in signals['moderate']:
            if keyword in name_lower:
                scores[category] += 1

    best = max(scores, key=scores.get)
    best_score = scores[best]

    if best_score >= 3:
        return best, 'keyword_rule'

    ml_category, confidence = predict_category(store_name)
    if ml_category and confidence >= CONFIDENCE_THRESHOLD:
        return ml_category, 'ml'

    if best_score > 0:
        return best, 'keyword_rule'

    return 'Shopping', 'default'


def resolve_category_id(cursor, category_name):
    """Look up category_id by name, return None if missing."""
    cursor.execute(
        'SELECT category_id FROM Categories WHERE category_name = %s',
        (category_name,)
    )
    row = cursor.fetchone()
    return row[0] if row else None


@purchases.route('/receipts/<user_id>', methods=['GET'])
def get_user_receipts(user_id):
    """Supports search/date/category filters, sorting, and pagination."""
    try:
        search = request.args.get('search', '').strip()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category = request.args.get('category')
        page = request.args.get('page')
        per_page = int(request.args.get('per_page', 20))

        allowed_sort_columns = {
            'date': 'r.date',
            'total_amount': 'r.total_amount',
            'category_name': 'c.category_name',
            'store_name': 's.store_name',
        }
        sort_by = request.args.get('sort_by', 'date')
        sort_order = request.args.get('sort_order', 'desc').lower()

        sort_col = allowed_sort_columns.get(sort_by, 'r.date')
        if sort_order not in ('asc', 'desc'):
            sort_order = 'desc'
        order_clause = f'ORDER BY {sort_col} {sort_order.upper()}'

        conditions = ['r.user_id = %s']
        params = [user_id]

        if search:
            conditions.append('s.store_name LIKE %s')
            params.append(f'%{search}%')
        if start_date:
            conditions.append('r.date >= %s')
            params.append(start_date)
        if end_date:
            conditions.append('r.date <= %s')
            params.append(end_date)
        if category:
            conditions.append('c.category_name = %s')
            params.append(category)

        where = ' AND '.join(conditions)
        cursor = db.get_db().cursor()

        base_from = '''
            FROM Receipts r
            LEFT JOIN Stores s ON r.store_id = s.store_id
            LEFT JOIN Categories c ON r.category_id = c.category_id
        '''

        if page:
            page = int(page)
            offset = (page - 1) * per_page

            cursor.execute(f'SELECT COUNT(*) {base_from} WHERE {where}', params)
            total = cursor.fetchone()[0]

            cursor.execute(f'''
                SELECT r.receipt_id, r.date, r.total_amount, r.user_id,
                       r.store_id, r.tag_id, r.category_id, r.category_source,
                       s.store_name, c.category_name
                {base_from}
                WHERE {where}
                {order_clause}
                LIMIT %s OFFSET %s
            ''', params + [per_page, offset])
            data = build_json_response(cursor, cursor.fetchall())

            return success_response({
                'receipts': data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            })
        else:
            cursor.execute(f'''
                SELECT r.receipt_id, r.date, r.total_amount, r.user_id,
                       r.store_id, r.tag_id, r.category_id, r.category_source,
                       s.store_name, c.category_name
                {base_from}
                WHERE {where}
                {order_clause}
            ''', params)
            data = build_json_response(cursor, cursor.fetchall())
            return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


def compute_date_range(period, offset):
    """Returns (start, end) for the given period and offset."""
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta

    today = date.today()
    offset = int(offset)

    if period == 'week':
        current_monday = today - timedelta(days=today.weekday())
        start = current_monday + timedelta(weeks=offset)
        end = start + timedelta(days=6)
    elif period == 'year':
        year = today.year + offset
        start = date(year, 1, 1)
        end = date(year, 12, 31)
    else:
        ref = today + relativedelta(months=offset)
        start = ref.replace(day=1)
        end = (start + relativedelta(months=1)) - timedelta(days=1)

    return start, end


@purchases.route('/receipts/<user_id>/summary', methods=['GET'])
def get_user_receipt_summary(user_id):
    """Aggregated spending data for a time period."""
    try:
        period = request.args.get('period', 'month')
        offset = int(request.args.get('offset', 0))

        start, end = compute_date_range(period, offset)
        prev_start, prev_end = compute_date_range(period, offset - 1)

        cursor = db.get_db().cursor()

        cursor.execute(
            'SELECT COALESCE(SUM(total_amount), 0) FROM Receipts WHERE user_id = %s AND date BETWEEN %s AND %s',
            (user_id, start, end)
        )
        total_spent = float(cursor.fetchone()[0])

        cursor.execute(
            'SELECT COALESCE(SUM(total_amount), 0) FROM Receipts WHERE user_id = %s AND date BETWEEN %s AND %s',
            (user_id, prev_start, prev_end)
        )
        previous_total = float(cursor.fetchone()[0])

        cursor.execute('''
            SELECT c.category_name, SUM(r.total_amount) as total, COUNT(*) as count
            FROM Receipts r
            LEFT JOIN Categories c ON r.category_id = c.category_id
            WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
            GROUP BY c.category_name
            ORDER BY total DESC
        ''', (user_id, start, end))
        by_category = build_json_response(cursor, cursor.fetchall())

        cursor.execute('''
            SELECT DATE(date - INTERVAL WEEKDAY(date) DAY) as week_start,
                   SUM(total_amount) as total
            FROM Receipts
            WHERE user_id = %s AND date BETWEEN %s AND %s
            GROUP BY week_start
            ORDER BY week_start ASC
        ''', (user_id, start, end))
        by_week = build_json_response(cursor, cursor.fetchall())

        cursor.execute('''
            SELECT DATE(r.date - INTERVAL WEEKDAY(r.date) DAY) as week_start,
                   c.category_name,
                   SUM(r.total_amount) as total
            FROM Receipts r
            LEFT JOIN Categories c ON r.category_id = c.category_id
            WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
            GROUP BY week_start, c.category_name
            ORDER BY week_start ASC, total DESC
        ''', (user_id, start, end))
        by_week_category = build_json_response(cursor, cursor.fetchall())

        result = {
            'total_spent': total_spent,
            'previous_total': previous_total,
            'period': period,
            'period_start': start.isoformat(),
            'period_end': end.isoformat(),
            'by_category': by_category,
            'by_week': by_week,
            'by_week_category': by_week_category
        }

        cursor.execute('''
            SELECT r.date as day_date, SUM(r.total_amount) as total
            FROM Receipts r
            WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
            GROUP BY r.date
            ORDER BY r.date ASC
        ''', (user_id, start, end))
        result['by_day'] = build_json_response(cursor, cursor.fetchall())

        if period == 'week':
            cursor.execute('''
                SELECT r.date as day_date, c.category_name, SUM(r.total_amount) as total
                FROM Receipts r
                LEFT JOIN Categories c ON r.category_id = c.category_id
                WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
                GROUP BY r.date, c.category_name
                ORDER BY r.date ASC, total DESC
            ''', (user_id, start, end))
            result['by_day_category'] = build_json_response(cursor, cursor.fetchall())

        if period == 'year':
            cursor.execute('''
                SELECT DATE_FORMAT(date, '%%Y-%%m-01') as month_start,
                       SUM(total_amount) as total
                FROM Receipts
                WHERE user_id = %s AND date BETWEEN %s AND %s
                GROUP BY month_start
                ORDER BY month_start ASC
            ''', (user_id, start, end))
            result['by_month'] = build_json_response(cursor, cursor.fetchall())

            cursor.execute('''
                SELECT DATE_FORMAT(r.date, '%%Y-%%m-01') as month_start,
                       c.category_name,
                       SUM(r.total_amount) as total
                FROM Receipts r
                LEFT JOIN Categories c ON r.category_id = c.category_id
                WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
                GROUP BY month_start, c.category_name
                ORDER BY month_start ASC, total DESC
            ''', (user_id, start, end))
            result['by_month_category'] = build_json_response(cursor, cursor.fetchall())

        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/<user_id>/top-merchants', methods=['GET'])
def get_top_merchants(user_id):
    """Returns the top merchants by total spend for the given period and offset."""
    try:
        period = request.args.get('period', 'month')
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 5))

        start, end = compute_date_range(period, offset)
        cursor = db.get_db().cursor()

        cursor.execute('''
            SELECT s.store_name,
                   SUM(r.total_amount) as total_spent,
                   COUNT(*) as visit_count,
                   MAX(s.is_subscription) as is_subscription
            FROM Receipts r
            LEFT JOIN Stores s ON r.store_id = s.store_id
            WHERE r.user_id = %s AND r.date BETWEEN %s AND %s
                  AND s.store_name IS NOT NULL
            GROUP BY s.store_name
            ORDER BY total_spent DESC
            LIMIT %s
        ''', (user_id, start, end, limit))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/<user_id>/store/<store_id>', methods=['GET'])
def get_receipts_by_store(user_id, store_id):
    """Returns all receipts for a user at a specific store, newest first."""
    try:
        cursor = db.get_db().cursor()
        cursor.execute('''
            SELECT r.receipt_id, r.date, r.total_amount,
                   s.store_name, c.category_name
            FROM Receipts r
            LEFT JOIN Stores s ON r.store_id = s.store_id
            LEFT JOIN Categories c ON r.category_id = c.category_id
            WHERE r.user_id = %s AND r.store_id = %s
            ORDER BY r.date DESC
            LIMIT 20
        ''', (user_id, store_id))
        data = build_json_response(cursor, cursor.fetchall())
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/<user_id>', methods=['POST'])
def create_receipt(user_id):
    """
    Accepts a store_id or store_name (we'll resolve/create the store).
    Category is auto-assigned from the store name.
    """
    try:
        the_data, err = validate_fields(['date', 'total_amount'])
        if err:
            return err

        store_name = the_data.get('store_name', '').strip()
        store_id = the_data.get('store_id')

        if not store_id and not store_name:
            return error_response('Either store_id or store_name is required', 400)

        cursor = db.get_db().cursor()
        conn = db.get_db()

        if store_name and not store_id:
            cursor.execute(
                'SELECT store_id FROM Stores WHERE store_name = %s LIMIT 1',
                (store_name,)
            )
            row = cursor.fetchone()
            if row:
                store_id = row[0]
            else:
                subscription = is_subscription_merchant(store_name)
                cursor.execute(
                    'INSERT INTO Stores '
                    '(store_name, zip_code, street_address, city, state, is_subscription) '
                    'VALUES (%s, %s, %s, %s, %s, %s)',
                    (store_name, '', '', '', '', subscription)
                )
                conn.commit()
                store_id = cursor.lastrowid

        user_category_id = the_data.get('category_id')

        if user_category_id:
            category_id = user_category_id
            category_source = 'user_override'
        else:
            category_name, category_source = categorize_store(store_name or '')
            category_id = resolve_category_id(cursor, category_name)

        query = '''
            INSERT INTO Receipts (date, total_amount, user_id, store_id, tag_id, category_id, category_source)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        '''
        values = (
            the_data['date'],
            the_data['total_amount'],
            user_id,
            store_id,
            the_data.get('tag_id'),
            category_id,
            category_source
        )
        cursor.execute(query, values)
        conn.commit()
        return success_response({'message': 'Receipt created successfully'}, 201)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/retrain', methods=['POST'])
def retrain_categorizer():
    """Retrain the ML categorizer using current receipt data."""
    try:
        cursor = db.get_db().cursor()
        result = train_model(cursor)
        if result.get('trained'):
            reset_model()
        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/detail/<receipt_id>', methods=['GET'])
def get_receipt(receipt_id):
    """Fetch a single receipt by its primary key."""
    try:
        cursor = db.get_db().cursor()
        cursor.execute('SELECT * FROM Receipts WHERE receipt_id = %s', (receipt_id,))
        row = cursor.fetchone()
        if not row:
            return error_response('Receipt not found', 404)
        row_headers = [x[0] for x in cursor.description]
        data = dict(zip(row_headers, row))
        return success_response(data)
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/<receipt_id>', methods=['PUT'])
def update_receipt(receipt_id):
    """Updates receipt fields. Only total_amount is required, date and category_id are optional."""
    try:
        the_data, err = validate_fields(['total_amount'])
        if err:
            return err

        set_clauses = ['total_amount = %s']
        values = [the_data['total_amount']]

        if 'date' in the_data:
            set_clauses.append('date = %s')
            values.append(the_data['date'])

        if 'category_id' in the_data:
            set_clauses.append('category_id = %s')
            set_clauses.append("category_source = 'user_override'")
            values.append(the_data['category_id'])

        values.append(receipt_id)
        query = f"UPDATE Receipts SET {', '.join(set_clauses)} WHERE receipt_id = %s"

        cursor = db.get_db().cursor()
        cursor.execute(query, values)
        db.get_db().commit()
        return success_response({'message': 'Receipt updated successfully'})
    except Exception as e:
        return error_response(str(e), 500)


@purchases.route('/receipts/<receipt_id>', methods=['DELETE'])
def delete_receipt(receipt_id):
    """Remove a receipt and let the DB cascade to its transactions."""
    try:
        query = 'DELETE FROM Receipts WHERE receipt_id = %s'
        cursor = db.get_db().cursor()
        cursor.execute(query, (receipt_id,))
        db.get_db().commit()
        return success_response({'message': 'Receipt deleted successfully'})
    except Exception as e:
        return error_response(str(e), 500)
