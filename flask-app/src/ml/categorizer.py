import os
import logging

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import joblib

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'category_pipeline.joblib')

CONFIDENCE_THRESHOLD = 0.6
MIN_TRAINING_SAMPLES = 20

# cache the model so we don't reload it every call
_model = None


def train_model(cursor):
    """
    Pull (store_name, category_name) from the DB and train the TF-IDF + LR model.
    Returns a small dict with what happened.
    """
    global _model

    cursor.execute('''
        SELECT s.store_name, c.category_name
        FROM Receipts r
        JOIN Stores s ON r.store_id = s.store_id
        JOIN Categories c ON r.category_id = c.category_id
        WHERE r.category_id IS NOT NULL
          AND s.store_name IS NOT NULL
          AND s.store_name != ''
    ''')
    rows = cursor.fetchall()

    if len(rows) < MIN_TRAINING_SAMPLES:
        return {
            'trained': False,
            'reason': f'Insufficient data: {len(rows)} samples, need {MIN_TRAINING_SAMPLES}'
        }

    store_names = [row[0].lower().strip() for row in rows]
    categories = [row[1] for row in rows]

    unique_categories = set(categories)
    if len(unique_categories) < 2:
        return {
            'trained': False,
            'reason': f'Need at least 2 categories, found {len(unique_categories)}'
        }

    # char_wb n-grams help with partial matches/misspellings in short store names
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 5),
            max_features=5000,
            lowercase=True
        )),
        ('clf', LogisticRegression(
            max_iter=1000,
            solver='lbfgs',
            multi_class='multinomial'
        ))
    ])

    pipeline.fit(store_names, categories)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    _model = pipeline

    logger.info('ML model trained on %d samples across %d categories',
                len(rows), len(unique_categories))

    return {
        'trained': True,
        'sample_count': len(rows),
        'categories': sorted(unique_categories)
    }


def _load_model():
    """Loads the model from disk into the cache."""
    global _model
    if _model is not None:
        return _model
    if os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
        return _model
    return None


def predict_category(store_name):
    """
    Predicts a category for a store name.
    Returns (category, confidence) or (None, 0.0) if no model is available.
    """
    model = _load_model()
    if model is None:
        return None, 0.0

    cleaned = store_name.lower().strip()
    if not cleaned:
        return None, 0.0

    probabilities = model.predict_proba([cleaned])[0]
    max_idx = max(range(len(probabilities)), key=lambda i: probabilities[i])
    confidence = float(probabilities[max_idx])
    predicted_category = model.classes_[max_idx]

    return predicted_category, confidence


def reset_model():
    """Clears the cached model so the next prediction reloads from disk."""
    global _model
    _model = None
