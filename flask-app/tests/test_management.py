import json


class TestSpendingGoals:
    def test_get_spending_goals(self, client, mock_cursor):
        mock_cursor.description = [('goal_id',), ('current_amount',), ('target_amount',)]
        mock_cursor.fetchall.return_value = [(1, 50.00, 200.00)]

        response = client.get('/management/spending-goals/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert len(data) == 1

    def test_create_spending_goal(self, client, mock_cursor):
        payload = {
            'current_amount': 0,
            'target_amount': 500,
            'month': 'January'
        }
        response = client.post('/management/spending-goals/1', json=payload)
        assert response.status_code == 201

    def test_create_goal_missing_fields(self, client):
        response = client.post('/management/spending-goals/1', json={'current_amount': 0})
        assert response.status_code == 400

    def test_get_single_goal(self, client, mock_cursor):
        mock_cursor.description = [('goal_id',), ('current_amount',)]
        mock_cursor.fetchone.return_value = (1, 50.00)

        response = client.get('/management/spending-goals/goal/1')
        assert response.status_code == 200

    def test_goal_not_found(self, client, mock_cursor):
        mock_cursor.fetchone.return_value = None

        response = client.get('/management/spending-goals/goal/999')
        assert response.status_code == 404

    def test_update_spending_goal(self, client, mock_cursor):
        payload = {
            'current_amount': 100,
            'target_amount': 500,
            'month': 'February'
        }
        response = client.put('/management/spending-goals/1', json=payload)
        assert response.status_code == 200

    def test_delete_spending_goal(self, client, mock_cursor):
        response = client.delete('/management/spending-goals/1')
        assert response.status_code == 200


class TestBudgets:
    def test_get_budgets_by_category(self, client, mock_cursor):
        mock_cursor.description = [('budget_id',), ('amount',)]
        mock_cursor.fetchall.return_value = [(1, 500.00)]

        response = client.get('/management/budgets/1')
        assert response.status_code == 200

    def test_create_budget(self, client, mock_cursor):
        payload = {
            'amount': 500,
            'start_date': '2024-01-01',
            'end_date': '2024-01-31',
            'user_id': 1
        }
        response = client.post('/management/budgets/1', json=payload)
        assert response.status_code == 201

    def test_update_budget(self, client, mock_cursor):
        payload = {
            'amount': 600,
            'start_date': '2024-01-01',
            'end_date': '2024-01-31',
            'notification_threshold': 550
        }
        response = client.put('/management/budgets/1', json=payload)
        assert response.status_code == 200

    def test_delete_budget(self, client, mock_cursor):
        response = client.delete('/management/budgets/1')
        assert response.status_code == 200

    def test_get_user_budgets(self, client, mock_cursor):
        mock_cursor.description = [('budget_id',), ('amount',)]
        mock_cursor.fetchall.return_value = [(1, 500.00), (2, 300.00)]

        response = client.get('/management/budgets/user/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert len(data) == 2


class TestNotifications:
    def test_get_user_notifications(self, client, mock_cursor):
        mock_cursor.description = [('notification_id',), ('Message',)]
        mock_cursor.fetchall.return_value = [(1, 'Budget alert')]

        response = client.get('/management/budgets/notifications/1')
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data[0]['Message'] == 'Budget alert'
