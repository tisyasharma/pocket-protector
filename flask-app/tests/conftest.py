import pytest
from unittest.mock import MagicMock, patch
from src import create_app


@pytest.fixture
def app():
    """Creates a Flask app configured for testing with a mocked database."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    mock_db = MagicMock()
    mock_db.get_db.return_value = mock_conn

    with patch('src.db', mock_db), \
         patch('src.purchases.receipts.db', mock_db), \
         patch('src.purchases.transactions.db', mock_db), \
         patch('src.purchases.stores.db', mock_db), \
         patch('src.descriptors.categories.db', mock_db), \
         patch('src.management.spending_goals.db', mock_db), \
         patch('src.management.budgets.db', mock_db), \
         patch('src.management.notifications.db', mock_db), \
         patch('src.users.accounts.db', mock_db), \
         patch('src.users.groups.db', mock_db), \
         patch('src.users.auth.db', mock_db):

        test_app = create_app()
        test_app.config['TESTING'] = True

        test_app.mock_db = mock_db
        test_app.mock_cursor = mock_cursor
        test_app.mock_conn = mock_conn

        yield test_app


@pytest.fixture
def client(app):
    """Provides a test client for making HTTP requests."""
    return app.test_client()


@pytest.fixture
def mock_cursor(app):
    """Provides direct access to the mocked database cursor."""
    return app.mock_cursor
