from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models.models import User, StudentProfile, CompanyProfile

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json()

    required = ['email', 'password', 'name']
    for field in required:
        if not data or not data.get(field, '').strip():
            return jsonify({'error': f'"{field}" is required'}), 400

    email = data['email'].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400

    cgpa = data.get('cgpa')
    if cgpa is not None:
        try:
            cgpa = float(cgpa)
            if not (0.0 <= cgpa <= 10.0):
                return jsonify({'error': 'CGPA must be between 0 and 10'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'CGPA must be a number'}), 400

    year = data.get('year')
    if year is not None:
        try:
            year = int(year)
            if year not in (1, 2, 3, 4):
                return jsonify({'error': 'Year must be 1, 2, 3, or 4'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Year must be an integer'}), 400

    user = User(
        email=email,
        password_hash=generate_password_hash(data['password']),
        role='student',
        is_active=True,
        is_blacklisted=False
    )
    db.session.add(user)
    db.session.flush()  # get user.id before committing

    profile = StudentProfile(
        user_id=user.id,
        name=data['name'].strip(),
        branch=data.get('branch', '').strip() or None,
        cgpa=cgpa,
        year=year
    )
    db.session.add(profile)
    db.session.commit()

    return jsonify({'message': 'Student registered successfully'}), 201


@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json()

    required = ['email', 'password', 'company_name']
    for field in required:
        if not data or not data.get(field, '').strip():
            return jsonify({'error': f'"{field}" is required'}), 400

    email = data['email'].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400

    user = User(
        email=email,
        password_hash=generate_password_hash(data['password']),
        role='company',
        is_active=True,
        is_blacklisted=False
    )
    db.session.add(user)
    db.session.flush()

    profile = CompanyProfile(
        user_id=user.id,
        company_name=data['company_name'].strip(),
        hr_contact=data.get('hr_contact', '').strip() or None,
        website=data.get('website', '').strip() or None,
        approval_status='pending'
    )
    db.session.add(profile)
    db.session.commit()

    return jsonify({'message': 'Company registered successfully. Awaiting admin approval.'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    email = data['email'].strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user.is_blacklisted:
        return jsonify({'error': 'Your account has been blacklisted. Contact admin.'}), 403

    if not user.is_active:
        return jsonify({'error': 'Your account is deactivated. Contact admin.'}), 403

    # Identity is the user id (string); role stored as additional claim
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role}
    )

    return jsonify({
        'access_token': access_token,
        'role': user.role,
        'message': 'Login successful'
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # JWT is stateless — the client discards the token
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    response = user.to_dict()

    if user.role == 'student' and user.student_profile:
        response['profile'] = user.student_profile.to_dict()
    elif user.role == 'company' and user.company_profile:
        response['profile'] = user.company_profile.to_dict()

    return jsonify(response), 200
