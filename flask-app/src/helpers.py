from flask import jsonify, make_response, request


def build_json_response(cursor, rows):
    """Convert raw DB tuples into a list of dicts keyed by column name."""
    row_headers = [x[0] for x in cursor.description]
    return [dict(zip(row_headers, row)) for row in rows]


def success_response(data, status_code=200):
    """Wrap data in a JSON response with the given status code."""
    response = make_response(jsonify(data))
    response.status_code = status_code
    response.mimetype = 'application/json'
    return response


def error_response(message, status_code=400):
    """Return a JSON error envelope, defaults to 400 Bad Request."""
    response = make_response(jsonify({'error': message}))
    response.status_code = status_code
    response.mimetype = 'application/json'
    return response


def validate_fields(required_fields):
    """Checks the request body for required fields, returns (data, err)."""
    data = request.json
    if not data:
        return None, error_response('Request body is required', 400)

    missing = [f for f in required_fields if f not in data]
    if missing:
        return None, error_response(f'Missing required fields: {", ".join(missing)}', 400)

    return data, None
