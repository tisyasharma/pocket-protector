import json


class TestReceipts:
    """CRUD tests for the /purchases/receipts endpoints."""
    def test_get_user_receipts(self, client, mock_cursor):
        mock_cursor.description = [('receipt_id',), ('date',), ('total_amount',)]
        mock_cursor.fetchall.return_value = [(1, '2024-01-01', 50.00)]

        response = client.get('/purchases/receipts/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert len(data) == 1

    def test_create_receipt(self, client, mock_cursor):
        payload = {
            'date': '2024-01-01',
            'total_amount': 99.99,
            'store_id': 1,
            'category_id': 1
        }
        response = client.post('/purchases/receipts/1', json=payload)
        assert response.status_code == 201

    def test_create_receipt_missing_fields(self, client):
        response = client.post('/purchases/receipts/1', json={'date': '2024-01-01'})
        assert response.status_code == 400

    def test_get_single_receipt(self, client, mock_cursor):
        mock_cursor.description = [('receipt_id',), ('total_amount',)]
        mock_cursor.fetchone.return_value = (1, 50.00)

        response = client.get('/purchases/receipts/detail/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data['receipt_id'] == 1

    def test_get_receipt_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.get('/purchases/receipts/detail/999')
        assert response.status_code == 404

    def test_update_receipt(self, client, mock_cursor):
        response = client.put('/purchases/receipts/1', json={'total_amount': 75.00})
        assert response.status_code == 200

    def test_delete_receipt(self, client, mock_cursor):
        response = client.delete('/purchases/receipts/1')
        assert response.status_code == 200


class TestTransactions:
    """CRUD tests for the /purchases/transactions endpoints."""
    def test_get_transactions(self, client, mock_cursor):
        mock_cursor.description = [('transaction_id',), ('item_name',), ('unit_cost',)]
        mock_cursor.fetchall.return_value = [(1, 'Milk', 3.50)]

        response = client.get('/purchases/transactions/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data[0]['item_name'] == 'Milk'

    def test_create_transaction(self, client, mock_cursor):
        payload = {
            'unit_cost': 5.99,
            'quantity': 2,
            'item_name': 'Bread'
        }
        response = client.post('/purchases/transactions/1', json=payload)
        assert response.status_code == 201

    def test_get_single_transaction(self, client, mock_cursor):
        mock_cursor.description = [('transaction_id',), ('item_name',)]
        mock_cursor.fetchone.return_value = (1, 'Milk')

        response = client.get('/purchases/transactions/detail/1')
        assert response.status_code == 200

    def test_transaction_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.get('/purchases/transactions/detail/999')
        assert response.status_code == 404

    def test_delete_transaction(self, client, mock_cursor):
        response = client.delete('/purchases/transactions/1')
        assert response.status_code == 200


class TestStores:
    """CRUD tests for the /purchases/stores endpoints."""
    def test_get_all_stores(self, client, mock_cursor):
        mock_cursor.description = [('store_id',), ('store_name',)]
        mock_cursor.fetchall.return_value = [(1, 'Whole Foods')]

        response = client.get('/purchases/stores')
        assert response.status_code == 200

    def test_create_store(self, client, mock_cursor):
        payload = {
            'store_name': 'Target',
            'zip_code': '10001',
            'street_address': '123 Main St',
            'city': 'New York',
            'state': 'NY'
        }
        response = client.post('/purchases/stores', json=payload)
        assert response.status_code == 201

    def test_get_single_store(self, client, mock_cursor):
        mock_cursor.description = [('store_id',), ('store_name',)]
        mock_cursor.fetchone.return_value = (1, 'Whole Foods')

        response = client.get('/purchases/stores/1')
        assert response.status_code == 200

    def test_store_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.get('/purchases/stores/999')
        assert response.status_code == 404

    def test_update_store(self, client, mock_cursor):
        payload = {
            'store_name': 'Updated Store',
            'zip_code': '10002',
            'street_address': '456 Elm St',
            'city': 'Boston',
            'state': 'MA'
        }
        response = client.put('/purchases/stores/1', json=payload)
        assert response.status_code == 200

    def test_delete_store(self, client, mock_cursor):
        response = client.delete('/purchases/stores/1')
        assert response.status_code == 200
