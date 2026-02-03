import os
from src import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    port = int(os.environ.get('PORT', 4000))
    app.run(debug=debug, host='0.0.0.0', port=port)
