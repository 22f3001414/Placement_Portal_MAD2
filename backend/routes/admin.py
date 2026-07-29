import os
import re
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from extensions import db, cache
from models.models import (
    User,
   StudentProfile,
    CompanyProfile,
    PlacementDrive,
    Application,
    StudentProfileUpdateRequest,
)
from routes.utils import role_required

admin_bp = Blueprint('admin', __name__)


def _clear_admin_cache():
    cache.delete('admin_dashboard')
    cache.delete('admin_companies')
    cache.delete('admin_companies_')
    cache.delete('admin_students')
    cache.delete('admin_students_')
    cache.delete('admin_drives')
    cache.delete('admin_drives_')
    cache.delete('admin_stats')


@admin_bp.route('/dashboard', methods=['GET'])
@role_required('admin')
@cache.cached(timeout=120, key_prefix='admin_dashboard')
def dashboard():
    total_students = User.query.filter_by(role='student').count()
    total_companies = CompanyProfile.query.count()
    total_drives = PlacementDrive.query.count()
    return jsonify({
        'students': total_students,
        'companies': total_companies,
        'drives': total_drives
    })


@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
@cache.cached(timeout=120, key_prefix='admin_stats')
def stats():
    from sqlalchemy import func
    app_rows = db.session.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    drive_rows = db.session.query(PlacementDrive.status, func.count(PlacementDrive.id)).group_by(PlacementDrive.status).all()
    return jsonify({
        'application_status': {s: c for s, c in app_rows},
        'drive_status': {s: c for s, c in drive_rows}
    })


# ── Companies ──────────────────────────────────────────────────────────────

@admin_bp.route('/companies', methods=['GET'])
@role_required('admin')
@cache.cached(timeout=60, key_prefix=lambda: f'admin_companies_{request.args.get("q","")}')
def list_companies():
    q = request.args.get('q', '').strip()
    query = db.session.query(CompanyProfile, User).join(User, CompanyProfile.user_id == User.id)
    if q:
        query = query.filter(
            db.or_(
                CompanyProfile.company_name.ilike(f'%{q}%'),
                User.email.ilike(f'%{q}%')
            )
        )
    rows = query.all()
    result = []
    for cp, user in rows:
        result.append({
            'id': cp.id,
            'user_id': user.id,
            'company_name': cp.company_name,
            'email': user.email,
            'hr_contact': cp.hr_contact,
            'website': cp.website,
            'approval_status': cp.approval_status,
            'is_active': user.is_active,
            'is_blacklisted': user.is_blacklisted,
            'created_at': user.created_at.isoformat() if user.created_at else None
        })
    return jsonify(result)


@admin_bp.route('/companies/<int:company_id>/approve', methods=['PUT'])
@role_required('admin')
def approve_company(company_id):
    cp = CompanyProfile.query.get_or_404(company_id)
    cp.approval_status = 'approved'
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Company approved'})


@admin_bp.route('/companies/<int:company_id>/reject', methods=['PUT'])
@role_required('admin')
def reject_company(company_id):
    cp = CompanyProfile.query.get_or_404(company_id)
    cp.approval_status = 'rejected'
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Company rejected'})


@admin_bp.route('/companies/<int:company_id>/blacklist', methods=['PUT'])
@role_required('admin')
def blacklist_company(company_id):
    cp = CompanyProfile.query.get_or_404(company_id)
    user = User.query.get_or_404(cp.user_id)
    user.is_blacklisted = True
    # Disable every drive permanently
    for drive in cp.drives:
        drive.is_available = False
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Company blacklisted'})


@admin_bp.route('/companies/<int:company_id>/deactivate', methods=['PUT'])
@role_required('admin')
def deactivate_company(company_id):

    cp = CompanyProfile.query.get_or_404(company_id)

    user = User.query.get_or_404(cp.user_id)

    user.is_active = False

    # Disable all drives
    for drive in cp.drives:
        drive.is_available = False

    db.session.commit()

    _clear_admin_cache()

    return jsonify({
        'message': 'Company deactivated successfully.'
    })

@admin_bp.route('/companies/<int:company_id>/activate', methods=['PUT'])
@role_required('admin')
def activate_company(company_id):
    cp = CompanyProfile.query.get_or_404(company_id)
    user = User.query.get_or_404(cp.user_id)
    user.is_active = True
    # Re-enable all drives
    for drive in cp.drives:
        drive.is_available = True
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Company activated'})


# ── Students ───────────────────────────────────────────────────────────────

@admin_bp.route('/students', methods=['GET'])
@role_required('admin')
@cache.cached(timeout=60, key_prefix=lambda: f'admin_students_{request.args.get("q","")}')
def list_students():
    q = request.args.get('q', '').strip()
    query = db.session.query(StudentProfile, User).join(User, StudentProfile.user_id == User.id)
    if q:
        query = query.filter(
            db.or_(
                StudentProfile.name.ilike(f'%{q}%'),
                User.email.ilike(f'%{q}%')
            )
        )
    rows = query.all()
    result = []
    for sp, user in rows:
        result.append({
            'id': sp.id,
            'user_id': user.id,
            'name': sp.name,
            'email': user.email,
            'branch': sp.branch,
            'cgpa': sp.cgpa,
            'year': sp.year,
            'is_active': user.is_active,
            'resume_filename': sp.resume_filename,
            'is_blacklisted': user.is_blacklisted,
            'created_at': user.created_at.isoformat() if user.created_at else None
        })
    return jsonify(result)


@admin_bp.route('/students/<int:student_id>/blacklist', methods=['PUT'])
@role_required('admin')
def blacklist_student(student_id):
    sp = StudentProfile.query.get_or_404(student_id)
    user = User.query.get_or_404(sp.user_id)
    user.is_blacklisted = True
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Student blacklisted'})


@admin_bp.route('/students/<int:student_id>/deactivate', methods=['PUT'])
@role_required('admin')
def deactivate_student(student_id):
    sp = StudentProfile.query.get_or_404(student_id)
    user = User.query.get_or_404(sp.user_id)
    user.is_active = False
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Student deactivated'})

@admin_bp.route('/students/<int:student_id>/activate', methods=['PUT'])
@role_required('admin')
def activate_student(student_id):
    sp = StudentProfile.query.get_or_404(student_id)
    user = User.query.get_or_404(sp.user_id)
    user.is_active = True
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Student activated'})

# ── Student Profile Update Requests ───────────────────────────────────────

@admin_bp.route('/profile-update-requests', methods=['GET'])
@role_required('admin')
def list_profile_update_requests():

    requests = StudentProfileUpdateRequest.query.filter_by(
        status="pending"
    ).all()

    result = []

    for req in requests:

        student = req.student
        user = student.user

        result.append({
            "request_id": req.id,

            "student_id": student.id,
            "student_name": student.name,
            "email": user.email,

            "current_branch": student.branch,
            "requested_branch": req.requested_branch,

            "current_cgpa": student.cgpa,
            "requested_cgpa": req.requested_cgpa,

            "current_year": student.year,
            "requested_year": req.requested_year,

            "submitted_at": req.created_at.isoformat()
            if req.created_at else None
        })

    return jsonify(result)

@admin_bp.route('/profile-update-requests/<int:request_id>/approve', methods=['PUT'])
@role_required('admin')
def approve_profile_update_request(request_id):

    request_entry = StudentProfileUpdateRequest.query.get(request_id)

    if not request_entry:
        return jsonify({"error": "Profile update request not found."}), 404

    if request_entry.status != "pending":
        return jsonify({
            "error": "This request has already been processed."
        }), 400

    student = request_entry.student

    # Apply the approved changes
    student.branch = request_entry.requested_branch
    student.cgpa = request_entry.requested_cgpa
    student.year = request_entry.requested_year

    # Mark request as approved
    request_entry.status = "approved"
    request_entry.approved_at = datetime.utcnow()

    admin_user = User.query.get(get_jwt_identity())
    request_entry.approved_by = admin_user.id

    db.session.commit()

    return jsonify({
        "message": "Profile update request approved successfully."
    }), 200
    
@admin_bp.route('/profile-update-requests/<int:request_id>/reject', methods=['PUT'])
@role_required('admin')
def reject_profile_update_request(request_id):

    request_entry = StudentProfileUpdateRequest.query.get(request_id)

    if not request_entry:
        return jsonify({
            "error": "Profile update request not found."
        }), 404

    if request_entry.status != "pending":
        return jsonify({
            "error": "This request has already been processed."
        }), 400

    request_entry.status = "rejected"
    request_entry.approved_at = datetime.utcnow()
    request_entry.approved_by = get_jwt_identity()

    db.session.commit()

    return jsonify({
        "message": "Profile update request rejected successfully."
    }), 200

# ── Drives ─────────────────────────────────────────────────────────────────

@admin_bp.route('/drives', methods=['GET'])
@role_required('admin')
@cache.cached(timeout=60, key_prefix=lambda: f'admin_drives_{request.args.get("q","")}')
def list_drives():
    q = request.args.get('q', '').strip()
    query = db.session.query(PlacementDrive, CompanyProfile).join(
        CompanyProfile, PlacementDrive.company_id == CompanyProfile.id
    )
    if q:
        query = query.filter(
            db.or_(
                PlacementDrive.job_title.ilike(f'%{q}%'),
                CompanyProfile.company_name.ilike(f'%{q}%')
            )
        )
    drives = query.all()
    result = []
    for drive, cp in drives:
        applicant_count = Application.query.filter_by(drive_id=drive.id).count()
        result.append({
            'id': drive.id,
            'job_title': drive.job_title,
            'company_name': cp.company_name,
            'company_id': cp.id,
            'deadline': drive.deadline.isoformat() if drive.deadline else None,
            'status': drive.status,
            'applicant_count': applicant_count,
            'created_at': drive.created_at.isoformat() if drive.created_at else None
        })
    return jsonify(result)


@admin_bp.route('/drives/<int:drive_id>/approve', methods=['PUT'])
@role_required('admin')
def approve_drive(drive_id):
    drive = PlacementDrive.query.get_or_404(drive_id)
    drive.status = 'approved'
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Drive approved'})


@admin_bp.route('/drives/<int:drive_id>/reject', methods=['PUT'])
@role_required('admin')
def reject_drive(drive_id):
    drive = PlacementDrive.query.get_or_404(drive_id)
    drive.status = 'rejected'
    db.session.commit()
    _clear_admin_cache()
    return jsonify({'message': 'Drive rejected'})


@admin_bp.route('/drives/<int:drive_id>/applications', methods=['GET'])
@role_required('admin')
def drive_applications(drive_id):
    PlacementDrive.query.get_or_404(drive_id)
    apps = db.session.query(Application, StudentProfile, User).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).join(
        User, StudentProfile.user_id == User.id
    ).filter(Application.drive_id == drive_id).all()
    result = []
    for app, sp, user in apps:
        result.append({
            'application_id': app.id,
            'student_id': sp.id,
            'name': sp.name,
            'email': user.email,
            'branch': sp.branch,
            'cgpa': sp.cgpa,
            'year': sp.year,
            'applied_date': app.applied_date.isoformat() if app.applied_date else None,
            'status': app.status
        })
    return jsonify(result)


# ── Reports ─────────────────────────────────────────────────────────────────

def _reports_dir():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'reports')


@admin_bp.route('/reports', methods=['GET'])
@role_required('admin')
def list_reports():
    rdir = _reports_dir()
    if not os.path.exists(rdir):
        return jsonify([])
    files = sorted([f for f in os.listdir(rdir) if f.endswith('.html')], reverse=True)
    return jsonify(files)


@admin_bp.route('/reports/generate', methods=['POST'])
@role_required('admin')
def generate_report():
    from tasks.tasks import send_monthly_report
    task = send_monthly_report.delay()
    return jsonify({'task_id': task.id, 'message': 'Report generation started.'}), 202


@admin_bp.route('/reports/<filename>', methods=['GET'])
@role_required('admin')
def download_report(filename):
    if not re.match(r'^[\w\-]+\.html$', filename):
        return jsonify({'error': 'Invalid filename.'}), 400
    filepath = os.path.join(_reports_dir(), filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'Report not found.'}), 404
    return send_file(filepath, mimetype='text/html')

@admin_bp.route('/students/<int:student_id>/resume', methods=['GET'])
@role_required('admin')
def view_student_resume(student_id):
    student = StudentProfile.query.get_or_404(student_id)

    if not student.resume_filename:
        return jsonify({'error': 'Student has not uploaded a resume.'}), 404

    resume_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'uploads',
        'resumes',
        student.resume_filename
    )

    if not os.path.exists(resume_path):
        return jsonify({'error': 'Resume file not found.'}), 404

    return send_file(
        resume_path,
        mimetype='application/pdf',
        as_attachment=False
    )
