import json


class TestCategories:
    def test_get_all_categories(self, client, mock_cursor):
        mock_cursor.description = [('category_id',), ('category_name',)]
        mock_cursor.fetchall.return_value = [(1, 'Groceries'), (2, 'Rent')]

        response = client.get('/descriptors/categories')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert len(data) == 2
        assert data[0]['category_name'] == 'Groceries'

    def test_get_single_category(self, client, mock_cursor):
        mock_cursor.description = [('category_id',), ('category_name',)]
        mock_cursor.fetchall.return_value = [(1, 'Groceries')]

        response = client.get('/descriptors/categories/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data[0]['category_name'] == 'Groceries'

    def test_category_not_found(self, client, mock_cursor):
        mock_cursor.description = [('category_id',), ('category_name',)]
        mock_cursor.fetchall.return_value = []

        response = client.get('/descriptors/categories/999')
        assert response.status_code == 404


class TestTags:
    def test_get_user_tags(self, client, mock_cursor):
        mock_cursor.description = [('tag_id',), ('tag_name',)]
        mock_cursor.fetchall.return_value = [(1, 'Groceries')]

        response = client.get('/descriptors/tags/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data[0]['tag_name'] == 'Groceries'

    def test_create_tag(self, client, mock_cursor):
        response = client.post('/descriptors/tags/1', json={'tag_name': 'New Tag'})
        assert response.status_code == 201

    def test_create_tag_missing_name(self, client):
        response = client.post('/descriptors/tags/1', json={})
        assert response.status_code == 400

    def test_update_tag(self, client, mock_cursor):
        response = client.put('/descriptors/tags/1', json={'tag_name': 'Updated Tag'})
        assert response.status_code == 200

    def test_delete_tag(self, client, mock_cursor):
        response = client.delete('/descriptors/tags/1')
        assert response.status_code == 200
