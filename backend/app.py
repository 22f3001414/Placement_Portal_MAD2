import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, jwt, cache, mail


celery = None  # populated by create_app(); imported by tasks/tasks.py


def create_app():
    app = Flask(
        __name__,
        template_folder='../frontend',
        static_folder='../frontend',
        static_url_path=''
    )
    app.config.from_object(Config)

    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads', 'resumes')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cache.init_app(app)
    mail.init_app(app)
    CORS(app)

    from tasks import make_celery
    global celery
    celery = make_celery(app)

    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.company import company_bp
    from routes.student import student_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(company_bp, url_prefix='/api/company')
    app.register_blueprint(student_bp, url_prefix='/api/student')

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify({'error': 'Missing or invalid token', 'reason': reason}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({'error': 'Invalid token', 'reason': reason}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    # Catch-all: serve index.html for all non-API, non-static routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        # Let Flask serve actual static files (src/*, etc.)
        if path.startswith('src/'):
            from flask import abort
            abort(404)
        return render_template('index.html')

    with app.app_context():
        db.create_all()
        _seed_admin()

    return app


def _seed_admin():
    from models.models import User
    from werkzeug.security import generate_password_hash
    if not User.query.filter_by(role='admin').first():
        admin = User(
            email='admin@ppa.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            is_active=True,
            is_blacklisted=False
        )
        db.session.add(admin)
        db.session.commit()
        print('[SEED] Admin user created: admin@ppa.com / admin123')


# Always call create_app() so the module-level `celery` global is populated
# whether this file is run directly (python app.py) or loaded by Celery CLI.
flask_app = create_app()

if __name__ == '__main__':
    flask_app.run(debug=True, port=5000)
