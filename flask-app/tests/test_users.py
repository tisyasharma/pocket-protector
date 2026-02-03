import json
from werkzeug.security import generate_password_hash


class TestGetUsers:
    def test_returns_all_users(self, client, mock_cursor):
        mock_cursor.description = [('user_id',), ('email',), ('first_name',)]
        mock_cursor.fetchall.return_value = [
            (1, 'test@example.com', 'John'),
            (2, 'test2@example.com', 'Jane')
        ]

        response = client.get('/users')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert len(data) == 2
        assert data[0]['email'] == 'test@example.com'

    def test_returns_empty_list(self, client, mock_cursor):
        mock_cursor.description = [('user_id',), ('email',)]
        mock_cursor.fetchall.return_value = []

        response = client.get('/users')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data == []


class TestGetUser:
    def test_returns_single_user(self, client, mock_cursor):
        mock_cursor.description = [('user_id',), ('email',), ('first_name',)]
        mock_cursor.fetchone.return_value = (1, 'test@example.com', 'John')

        response = client.get('/users/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['email'] == 'test@example.com'

    def test_user_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.get('/users/999')
        assert response.status_code == 404


class TestCreateUser:
    def test_creates_user_successfully(self, client, mock_cursor):
        payload = {
            'email': 'new@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'securepass'
        }

        response = client.post('/users', json=payload)
        data = json.loads(response.data)

        assert response.status_code == 201
        assert 'created' in data['message'].lower()

    def test_missing_required_fields(self, client):
        response = client.post('/users', json={'email': 'test@example.com'})
        assert response.status_code == 400

    def test_no_request_body(self, client):
        response = client.post('/users', content_type='application/json')
        assert response.status_code in (400, 500)


class TestUpdateUser:
    def test_updates_user(self, client, mock_cursor):
        payload = {
            'group_id': 1,
            'email': 'updated@example.com',
            'first_name': 'Updated',
            'last_name': 'User',
            'password': 'newpass'
        }

        response = client.put('/users/1', json=payload)
        assert response.status_code == 200


class TestDeleteUser:
    def test_deletes_user(self, client, mock_cursor):
        response = client.delete('/users/1')
        assert response.status_code == 200


class TestLogin:
    def test_successful_login(self, client, mock_cursor):
        hashed = generate_password_hash('password123')
        mock_cursor.description = [('user_id',), ('email',), ('first_name',), ('password',)]
        mock_cursor.fetchone.return_value = (1, 'test@example.com', 'John', hashed)

        response = client.post('/users/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        data = json.loads(response.data)

        assert response.status_code == 200
        assert 'password' not in data

    def test_wrong_password(self, client, mock_cursor):
        hashed = generate_password_hash('password123')
        mock_cursor.description = [('user_id',), ('email',), ('password',)]
        mock_cursor.fetchone.return_value = (1, 'test@example.com', hashed)

        response = client.post('/users/login', json={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401

    def test_user_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.post('/users/login', json={
            'email': 'nobody@example.com',
            'password': 'password123'
        })
        assert response.status_code == 401

    def test_missing_fields(self, client):
        response = client.post('/users/login', json={'email': 'test@example.com'})
        assert response.status_code == 400


class TestGroups:
    def test_create_group(self, client, mock_cursor):
        response = client.post('/users/group/1', json={'group_name': 'Test Group'})
        assert response.status_code == 201

    def test_update_group(self, client, mock_cursor):
        response = client.put('/users/group/1', json={
            'group_name': 'Updated Group',
            'admin_user_id': 2
        })
        assert response.status_code == 200

    def test_get_group_members(self, client, mock_cursor):
        mock_cursor.description = [('user_id',), ('email',)]
        mock_cursor.fetchall.return_value = [(1, 'user@example.com')]

        response = client.get('/users/group-members/1')
        assert response.status_code == 200
