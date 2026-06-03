import os
from flask import Blueprint, jsonify, request, send_file, current_app
from sqlalchemy.exc import IntegrityError
from extensions import db, cache
from models.models import StudentProfile, PlacementDrive, Application, CompanyProfile
from routes.utils import role_required, get_current_user_id
from datetime import datetime, time

student_bp = Blueprint('student', __name__)


def _get_student_profile():
    user_id = get_current_user_id()
    sp = StudentProfile.query.filter_by(user_id=user_id).first()
    if not sp:
        return None, (jsonify({'error': 'Student profile not found'}), 404)
    return sp, None


def _drive_to_dict(drive, already_applied=False):
    cp = CompanyProfile.query.get(drive.company_id)
    return {
        'id': drive.id,
        'job_title': drive.job_title,
        'job_description': drive.job_description,
        'company_name': cp.company_name if cp else '',
        'eligible_branches': drive.eligible_branches,
        'min_cgpa': drive.min_cgpa,
        'eligible_years': drive.eligible_years,
        'deadline': drive.deadline.isoformat() if drive.deadline else None,
        'status': drive.status,
        'already_applied': already_applied
    }


def _today_start():
    return datetime.combine(datetime.utcnow().date(), time.min)


# ── Dashboard ─────────────────────────────────────────────────────────────

@student_bp.route('/dashboard', methods=['GET'])
@role_required('student')
def dashboard():
    sp, err = _get_student_profile()
    if err:
        return err

    drives = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline >= _today_start()
    ).all()

    applied_ids = {a.drive_id for a in Application.query.filter_by(student_id=sp.id).all()}
    drives_data = [_drive_to_dict(d, d.id in applied_ids) for d in drives]

    applications = db.session.query(Application, PlacementDrive, CompanyProfile).join(
        PlacementDrive, Application.drive_id == PlacementDrive.id
    ).join(
        CompanyProfile, PlacementDrive.company_id == CompanyProfile.id
    ).filter(Application.student_id == sp.id).all()

    apps_data = [{
        'application_id': app.id,
        'job_title': drive.job_title,
        'company_name': cp.company_name,
        'applied_date': app.applied_date.isoformat() if app.applied_date else None,
        'status': app.status
    } for app, drive, cp in applications]

    return jsonify({
        'profile': {
            'id': sp.id,
            'name': sp.name,
            'branch': sp.branch,
            'cgpa': sp.cgpa,
            'year': sp.year,
            'resume_filename': sp.resume_filename
        },
        'drives': drives_data,
        'applications': apps_data
    })


# ── Profile Edit ──────────────────────────────────────────────────────────

@student_bp.route('/profile', methods=['PUT'])
@role_required('student')
def edit_profile():
    sp, err = _get_student_profile()
    if err:
        return err

    data = request.get_json() or {}

    if 'name' in data:
        name = (data['name'] or '').strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty.'}), 400
        sp.name = name

    if 'branch' in data:
        sp.branch = (data['branch'] or '').strip() or None

    if 'cgpa' in data:
        raw = data['cgpa']
        if raw == '' or raw is None:
            sp.cgpa = None
        else:
            try:
                cgpa = float(raw)
                if not (0 <= cgpa <= 10):
                    return jsonify({'error': 'CGPA must be between 0 and 10.'}), 400
                sp.cgpa = cgpa
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid CGPA value.'}), 400

    if 'year' in data:
        raw = data['year']
        if raw == '' or raw is None:
            sp.year = None
        else:
            try:
                year = int(raw)
                if year not in range(1, 5):
                    return jsonify({'error': 'Year must be between 1 and 4.'}), 400
                sp.year = year
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid year value.'}), 400

    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully.',
        'profile': {
            'id': sp.id, 'name': sp.name, 'branch': sp.branch,
            'cgpa': sp.cgpa, 'year': sp.year, 'resume_filename': sp.resume_filename
        }
    })


# ── Resume Upload ─────────────────────────────────────────────────────────

@student_bp.route('/resume', methods=['POST'])
@role_required('student')
def upload_resume():
    sp, err = _get_student_profile()
    if err:
        return err

    if 'resume' not in request.files:
        return jsonify({'error': 'No file provided. Use field name "resume".'}), 400

    file = request.files['resume']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed.'}), 400

    upload_dir = current_app.config['UPLOAD_FOLDER']
    filename = f'student_{sp.id}_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}.pdf'
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    sp.resume_filename = filename
    db.session.commit()
    return jsonify({'message': 'Resume uploaded successfully.', 'filename': filename})


# ── Drives (with optional search) ────────────────────────────────────────

@student_bp.route('/drives', methods=['GET'])
@role_required('student')
def list_drives():
    sp, err = _get_student_profile()
    if err:
        return err

    q = request.args.get('q', '').strip().lower()

    drives = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline >= _today_start()
    ).all()

    if q:
        drives = [
            d for d in drives
            if q in d.job_title.lower() or q in (CompanyProfile.query.get(d.company_id).company_name or '').lower()
        ]

    applied_ids = {a.drive_id for a in Application.query.filter_by(student_id=sp.id).all()}
    return jsonify([_drive_to_dict(d, d.id in applied_ids) for d in drives])


# ── Apply ─────────────────────────────────────────────────────────────────

@student_bp.route('/drives/<int:drive_id>/apply', methods=['POST'])
@role_required('student')
def apply_to_drive(drive_id):
    sp, err = _get_student_profile()
    if err:
        return err

    drive = PlacementDrive.query.get_or_404(drive_id)

    if drive.status != 'approved':
        return jsonify({'error': 'This drive is not open for applications.'}), 400

    if drive.deadline and drive.deadline < _today_start():
        return jsonify({'error': 'The application deadline has passed.'}), 400

    if drive.eligible_branches:
        allowed = [b.strip() for b in drive.eligible_branches.split(',') if b.strip()]
        if allowed and sp.branch and sp.branch not in allowed:
            return jsonify({'error': f'Your branch ({sp.branch}) is not eligible for this drive.'}), 403

    if drive.eligible_years:
        allowed = [int(y.strip()) for y in drive.eligible_years.split(',') if y.strip().isdigit()]
        if allowed and sp.year and sp.year not in allowed:
            return jsonify({'error': f'Your year ({sp.year}) is not eligible for this drive.'}), 403

    if sp.cgpa is not None and sp.cgpa < drive.min_cgpa:
        return jsonify({'error': f'Your CGPA ({sp.cgpa}) is below the minimum required ({drive.min_cgpa}).'}), 403

    application = Application(student_id=sp.id, drive_id=drive_id)
    db.session.add(application)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'You have already applied to this drive.'}), 409

    return jsonify({'message': 'Application submitted successfully!', 'application_id': application.id}), 201


# ── Applications list (cached per student) ────────────────────────────────

@student_bp.route('/applications', methods=['GET'])
@role_required('student')
def my_applications():
    sp, err = _get_student_profile()
    if err:
        return err

    rows = db.session.query(Application, PlacementDrive, CompanyProfile).join(
        PlacementDrive, Application.drive_id == PlacementDrive.id
    ).join(
        CompanyProfile, PlacementDrive.company_id == CompanyProfile.id
    ).filter(Application.student_id == sp.id).all()

    return jsonify([{
        'application_id': app.id,
        'job_title': drive.job_title,
        'company_name': cp.company_name,
        'applied_date': app.applied_date.isoformat() if app.applied_date else None,
        'status': app.status
    } for app, drive, cp in rows])


# ── CSV Export (async Celery job) ─────────────────────────────────────────

@student_bp.route('/export-applications', methods=['POST'])
@role_required('student')
def trigger_export():
    sp, err = _get_student_profile()
    if err:
        return err

    from tasks.tasks import export_student_applications
    task = export_student_applications.delay(sp.id)
    return jsonify({'task_id': task.id, 'message': 'Export started. Poll /export-applications/<task_id> for status.'}), 202


@student_bp.route('/export-applications/<task_id>', methods=['GET'])
@role_required('student')
def poll_export(task_id):
    try:
        from tasks.tasks import export_student_applications
        result = export_student_applications.AsyncResult(task_id)
        state = result.state

        if state == 'SUCCESS':
            r = result.result or {}
            return jsonify({'status': 'done', 'count': r.get('count', 0)})
        if state == 'FAILURE':
            return jsonify({'status': 'failed', 'error': str(result.info)})
        # PENDING, STARTED, RETRY → still in progress
        return jsonify({'status': 'pending'})
    except Exception as e:
        return jsonify({'status': 'failed', 'error': str(e)})


@student_bp.route('/download-export', methods=['GET'])
@role_required('student')
def download_export():
    sp, err = _get_student_profile()
    if err:
        return err

    filepath = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'exports',
        f'applications_student_{sp.id}.csv'
    )
    if not os.path.exists(filepath):
        return jsonify({'error': 'No export found. Trigger an export first.'}), 404

    return send_file(filepath, as_attachment=True, download_name='my_applications.csv')
