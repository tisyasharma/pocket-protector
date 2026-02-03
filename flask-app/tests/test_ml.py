import json
from unittest.mock import patch, MagicMock


class TestCategorizeStoreIntegration:
    """Tests the four-tier categorize_store function with ML fallback."""

    def test_merchant_rule_takes_priority(self):
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category') as mock_ml:
            name, source = categorize_store("Trader Joe's Market")
            assert name == 'Food & Drink'
            assert source == 'merchant_rule'
            mock_ml.assert_not_called()

    def test_strong_keyword_skips_ml(self):
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category') as mock_ml:
            name, source = categorize_store('Downtown Restaurant and Bakery')
            assert source == 'keyword_rule'
            mock_ml.assert_not_called()

    def test_weak_keyword_defers_to_ml(self):
        """When keyword score is 1-2, ML gets a chance if it has high confidence."""
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category', return_value=('Health', 0.85)):
            name, source = categorize_store('Green Yoga Place')
            assert name == 'Health'
            assert source == 'ml'

    def test_low_confidence_ml_falls_back_to_keyword(self):
        """ML prediction below threshold, so weak keyword match wins."""
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category', return_value=('Health', 0.3)):
            name, source = categorize_store('Green Yoga Place')
            assert source == 'keyword_rule'

    def test_no_match_returns_default(self):
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category', return_value=(None, 0.0)):
            name, source = categorize_store('XYZZY Corp 12345')
            assert name == 'Shopping'
            assert source == 'default'

    def test_ml_used_when_no_keyword_match(self):
        """No keyword match at all, but ML is confident."""
        from src.purchases.receipts import categorize_store
        with patch('src.purchases.receipts.predict_category', return_value=('Travel', 0.78)):
            name, source = categorize_store('XYZZY Corp 12345')
            assert name == 'Travel'
            assert source == 'ml'


class TestMLPredictor:
    """Tests the ML module's predict and train functions in isolation."""

    @patch('src.ml.categorizer.joblib.load')
    @patch('src.ml.categorizer.os.path.exists', return_value=True)
    def test_predict_loads_model_and_returns_category(self, mock_exists, mock_load):
        from src.ml.categorizer import predict_category, reset_model
        reset_model()

        mock_pipeline = MagicMock()
        mock_pipeline.predict_proba.return_value = [[0.1, 0.8, 0.1]]
        mock_pipeline.classes_ = ['Entertainment', 'Food & Drink', 'Shopping']
        mock_load.return_value = mock_pipeline

        category, confidence = predict_category('some restaurant')
        assert category == 'Food & Drink'
        assert confidence == 0.8

    @patch('src.ml.categorizer.os.path.exists', return_value=False)
    def test_predict_returns_none_when_no_model(self, mock_exists):
        from src.ml.categorizer import predict_category, reset_model
        reset_model()
        category, confidence = predict_category('any store')
        assert category is None
        assert confidence == 0.0

    def test_predict_handles_empty_string(self):
        from src.ml.categorizer import predict_category
        category, confidence = predict_category('')
        assert category is None
        assert confidence == 0.0

    def test_train_rejects_insufficient_data(self):
        from src.ml.categorizer import train_model
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            (f'Store {i}', 'Shopping') for i in range(5)
        ]
        result = train_model(mock_cursor)
        assert result['trained'] is False
        assert 'Insufficient' in result['reason']

    def test_train_rejects_single_category(self):
        from src.ml.categorizer import train_model
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            (f'Store {i}', 'Shopping') for i in range(30)
        ]
        result = train_model(mock_cursor)
        assert result['trained'] is False
        assert '2 categories' in result['reason']

    @patch('src.ml.categorizer.joblib.dump')
    @patch('src.ml.categorizer.os.makedirs')
    def test_train_succeeds_with_valid_data(self, mock_makedirs, mock_dump):
        from src.ml.categorizer import train_model, reset_model
        reset_model()

        mock_cursor = MagicMock()
        training_data = (
            [(f'Restaurant {i}', 'Food & Drink') for i in range(15)]
            + [(f'Gas Station {i}', 'Transportation') for i in range(15)]
        )
        mock_cursor.fetchall.return_value = training_data

        result = train_model(mock_cursor)
        assert result['trained'] is True
        assert result['sample_count'] == 30
        assert 'Food & Drink' in result['categories']
        assert 'Transportation' in result['categories']
        mock_dump.assert_called_once()


class TestRetrainEndpoint:

    def _mock_db(self):
        """Patches the db reference inside receipts.py so get_db works without a real app context."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db = MagicMock()
        mock_db.get_db.return_value = mock_conn
        return patch('src.purchases.receipts.db', mock_db)

    def test_retrain_success(self, app, client):
        with self._mock_db():
            with patch('src.purchases.receipts.train_model',
                       return_value={'trained': True, 'sample_count': 100,
                                     'categories': ['Food & Drink', 'Shopping']}):
                with patch('src.purchases.receipts.reset_model'):
                    response = client.post('/purchases/receipts/retrain')
                    data = json.loads(response.data)
                    assert response.status_code == 200
                    assert data['trained'] is True

    def test_retrain_insufficient_data(self, app, client):
        with self._mock_db():
            with patch('src.purchases.receipts.train_model',
                       return_value={'trained': False,
                                     'reason': 'Insufficient data: 5 samples, need 20'}):
                response = client.post('/purchases/receipts/retrain')
                data = json.loads(response.data)
                assert response.status_code == 200
                assert data['trained'] is False
                assert 'Insufficient' in data['reason']
