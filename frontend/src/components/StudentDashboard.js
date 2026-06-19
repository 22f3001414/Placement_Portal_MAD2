const StudentDashboard = {
  name: 'StudentDashboard',
  components: { Navbar },
  data() {
    return {
      userEmail: '',
      loading: true,
      profile: null,
      drives: [],
      applications: [],
      activeTab: 'drives',

      // Drive search
      driveSearch: '',

      // Profile edit
      editingProfile: false,
      editForm: { name: '', branch: '', cgpa: '', year: '' },
      editLoading: false,
      editMsg: { text: '', type: '' },

      // Resume upload
      resumeFile: null,
      resumeLoading: false,
      resumeMsg: { text: '', type: '' },

      // Apply feedback (per drive)
      applyMsg: { driveId: null, text: '', type: '' },

      // CSV export
      exportTaskId: null,
      exportStatus: null,   // 'pending' | 'done' | 'failed'
      exportLoading: false,
      exportMsg: { text: '', type: '' },

      pageMsg: { text: '', type: '' }
    }
  },
  template: `
    <div>
      <Navbar role="student" :userEmail="userEmail" />

      <div class="container-fluid py-4 px-4">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-success" role="status"></div>
        </div>

        <div v-else>
          <!-- ── Profile Card ── -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">

              <!-- View mode -->
              <div v-if="!editingProfile">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle bg-success d-flex align-items-center justify-content-center text-white fw-bold"
                      style="width:56px;height:56px;font-size:1.4rem">
                      {{ profile.name ? profile.name[0].toUpperCase() : '?' }}
                    </div>
                    <div>
                      <h4 class="fw-bold mb-0">{{ profile.name }}</h4>
                      <span class="text-muted small">
                        {{ profile.branch || '—' }}
                        <span v-if="profile.year"> &bull; Year {{ profile.year }}</span>
                        <span v-if="profile.cgpa != null"> &bull; CGPA {{ profile.cgpa }}</span>
                      </span>
                      <div v-if="profile.resume_filename" class="mt-1 d-flex align-items-center gap-2">
                        <span class="badge bg-success"><i class="bi bi-file-earmark-pdf me-1"></i>Resume uploaded</span>
                        <button class="btn btn-outline-secondary btn-sm py-0" @click="viewResume">
                          <i class="bi bi-eye me-1"></i>View
                        </button>
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-outline-secondary btn-sm" @click="startEdit">
                    <i class="bi bi-pencil me-1"></i>Edit Profile
                  </button>
                </div>

                <!-- Resume upload -->
                <div class="mt-3 d-flex align-items-center gap-2 flex-wrap">
                  <label class="form-label mb-0 fw-semibold small">Resume (PDF):</label>
                  <input type="file" accept=".pdf" class="form-control form-control-sm" style="max-width:260px"
                    @change="onResumeSelect" />
                  <button class="btn btn-outline-primary btn-sm" @click="uploadResume" :disabled="!resumeFile || resumeLoading">
                    <span v-if="resumeLoading" class="spinner-border spinner-border-sm me-1"></span>
                    {{ resumeLoading ? 'Uploading…' : 'Upload' }}
                  </button>
                  <span v-if="resumeMsg.text" class="small" :class="resumeMsg.type==='success'?'text-success':'text-danger'">
                    {{ resumeMsg.text }}
                  </span>
                </div>
              </div>

              <!-- Edit mode -->
              <div v-else>
                <h5 class="fw-bold mb-3">Edit Profile</h5>
                <div v-if="editMsg.text" class="alert py-2" :class="'alert-' + editMsg.type">{{ editMsg.text }}</div>
                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
                    <input v-model="editForm.name" type="text" class="form-control" placeholder="Full name" />
                  </div>
                  <div class="col-12 col-md-6">
                    <label class="form-label fw-semibold">Branch</label>
                    <select v-model="editForm.branch" class="form-select">
                      <option value="">Select branch</option>
                      <option v-for="b in ['CS','DS','ES','EE','ME','CE','CH','MA','PH','HS']" :key="b" :value="b">{{ b }}</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label fw-semibold">CGPA</label>
                    <input v-model="editForm.cgpa" type="number" class="form-control" placeholder="0–10" min="0" max="10" step="0.01" />
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label fw-semibold">Year</label>
                    <select v-model="editForm.year" class="form-select">
                      <option value="">Year</option>
                      <option v-for="y in [1,2,3,4]" :key="y" :value="y">Year {{ y }}</option>
                    </select>
                  </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button class="btn btn-success btn-sm" @click="saveProfile" :disabled="editLoading">
                    <span v-if="editLoading" class="spinner-border spinner-border-sm me-1"></span>
                    Save
                  </button>
                  <button class="btn btn-secondary btn-sm" @click="cancelEdit">Cancel</button>
                </div>
              </div>

            </div>
          </div>

          <!-- Page-level alert -->
          <div v-if="pageMsg.text" class="alert" :class="'alert-' + pageMsg.type">{{ pageMsg.text }}</div>

          <!-- ── Tabs ── -->
          <ul class="nav nav-tabs mb-4">
            <li class="nav-item">
              <a class="nav-link" :class="{active: activeTab==='drives'}" href="#" @click.prevent="switchTab('drives')">
                <i class="bi bi-briefcase me-1"></i>Available Drives
                <span class="badge bg-success ms-1">{{ filteredDrives.length }}</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" :class="{active: activeTab==='applications'}" href="#" @click.prevent="switchTab('applications')">
                <i class="bi bi-file-earmark-check me-1"></i>My Applications
                <span class="badge bg-secondary ms-1">{{ applications.length }}</span>
              </a>
            </li>
          </ul>

          <!-- ── AVAILABLE DRIVES ── -->
          <div v-if="activeTab==='drives'">
            <!-- Search bar -->
            <div class="d-flex gap-2 mb-3 flex-wrap">
              <input v-model="driveSearch" type="text" class="form-control w-auto"
                placeholder="Search by title or company…" style="min-width:240px" />
              <span v-if="driveSearch" class="btn btn-outline-secondary btn-sm" @click="driveSearch=''">Clear</span>
            </div>

            <div v-if="filteredDrives.length === 0" class="text-muted">No open drives match your search.</div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle">
                <thead class="table-dark">
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Deadline</th>
                    <th>Min CGPA</th>
                    <th>Branches</th>
                    <th>Years</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in filteredDrives" :key="d.id">
                    <td class="fw-semibold">{{ d.job_title }}</td>
                    <td>{{ d.company_name }}</td>
                    <td>{{ d.deadline ? d.deadline.slice(0,10) : '—' }}</td>
                    <td>{{ d.min_cgpa || '—' }}</td>
                    <td>{{ d.eligible_branches || 'All' }}</td>
                    <td>{{ d.eligible_years || 'All' }}</td>
                    <td>
                      <button v-if="!d.already_applied" class="btn btn-success btn-sm" @click="applyToDrive(d)">
                        <i class="bi bi-send me-1"></i>Apply
                      </button>
                      <span v-else class="badge bg-secondary">Applied</span>
                      <div v-if="applyMsg.driveId === d.id && applyMsg.text"
                        class="mt-1 small" :class="applyMsg.type==='success'?'text-success':'text-danger'">
                        {{ applyMsg.text }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── MY APPLICATIONS ── -->
          <div v-if="activeTab==='applications'">
            <!-- Export controls -->
            <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <button class="btn btn-outline-primary btn-sm" @click="triggerExport" :disabled="exportLoading || exportStatus==='pending'">
                <span v-if="exportLoading || exportStatus==='pending'" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-download me-1"></i>
                {{ exportStatus === 'pending' ? 'Generating CSV…' : 'Export as CSV' }}
              </button>
              <button v-if="exportStatus === 'done'" class="btn btn-success btn-sm" @click="downloadExport">
                <i class="bi bi-file-earmark-spreadsheet me-1"></i>Download CSV
              </button>
              <span v-if="exportMsg.text" class="small" :class="exportMsg.type==='success'?'text-success':'text-danger'">
                {{ exportMsg.text }}
              </span>
            </div>

            <div v-if="applications.length === 0" class="text-muted">You have not applied to any drives yet.</div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle">
                <thead class="table-dark">
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Applied On</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in applications" :key="a.application_id">
                    <td class="fw-semibold">{{ a.job_title }}</td>
                    <td>{{ a.company_name }}</td>
                    <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '—' }}</td>
                    <td>
                      <span class="badge" :class="statusBadge(a.status)">{{ a.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  computed: {
    filteredDrives() {
      const q = this.driveSearch.trim().toLowerCase()
      if (!q) return this.drives
      return this.drives.filter(d =>
        d.job_title.toLowerCase().includes(q) ||
        d.company_name.toLowerCase().includes(q)
      )
    },
  },
  methods: {
    statusBadge(status) {
      return {
        'bg-secondary': status === 'applied',
        'bg-warning text-dark': status === 'shortlisted',
        'bg-success': status === 'selected',
        'bg-danger': status === 'rejected'
      }
    },

    switchTab(tab) {
      this.activeTab = tab
      this.applyMsg = { driveId: null, text: '', type: '' }
      if (tab === 'applications') this.loadApplications()
    },

    // ── Profile edit ──────────────────────────────────────────────────────
    startEdit() {
      this.editForm = {
        name: this.profile.name || '',
        branch: this.profile.branch || '',
        cgpa: this.profile.cgpa != null ? this.profile.cgpa : '',
        year: this.profile.year || ''
      }
      this.editMsg = { text: '', type: '' }
      this.editingProfile = true
    },

    cancelEdit() {
      this.editingProfile = false
    },

    async saveProfile() {
      this.editMsg = { text: '', type: '' }
      if (!this.editForm.name.trim()) {
        this.editMsg = { text: 'Name is required.', type: 'danger' }
        return
      }
      this.editLoading = true
      try {
        const res = await api.put('/api/student/profile', {
          name: this.editForm.name.trim(),
          branch: this.editForm.branch || null,
          cgpa: this.editForm.cgpa !== '' ? parseFloat(this.editForm.cgpa) : null,
          year: this.editForm.year !== '' ? parseInt(this.editForm.year) : null
        })
        this.profile = { ...this.profile, ...res.profile }
        this.editingProfile = false
        this.pageMsg = { text: 'Profile updated successfully.', type: 'success' }
        setTimeout(() => { this.pageMsg = { text: '', type: '' } }, 3000)
      } catch (err) {
        this.editMsg = { text: err.data?.error || 'Failed to update profile.', type: 'danger' }
      }
      this.editLoading = false
    },

    // ── Resume view/upload ────────────────────────────────────────────────
    async viewResume() {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/student/resume/download', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) {
          const data = await res.json()
          this.resumeMsg = { text: data.error || 'Could not load resume.', type: 'danger' }
          return
        }
        const blob = await res.blob()
        window.open(URL.createObjectURL(blob), '_blank')
      } catch (_) {
        this.resumeMsg = { text: 'Failed to open resume.', type: 'danger' }
      }
    },

    onResumeSelect(e) {
      this.resumeFile = e.target.files[0] || null
      this.resumeMsg = { text: '', type: '' }
    },

    async uploadResume() {
      if (!this.resumeFile) return
      this.resumeLoading = true
      this.resumeMsg = { text: '', type: '' }
      try {
        const formData = new FormData()
        formData.append('resume', this.resumeFile)
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/student/resume', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        const data = await res.json()
        if (!res.ok) throw { data }
        this.resumeMsg = { text: 'Resume uploaded!', type: 'success' }
        this.profile.resume_filename = data.filename
        this.resumeFile = null
      } catch (err) {
        this.resumeMsg = { text: err.data?.error || 'Upload failed.', type: 'danger' }
      }
      this.resumeLoading = false
    },

    // ── Load data ─────────────────────────────────────────────────────────
    async loadDashboard() {
      this.loading = true
      try {
        const data = await api.get('/api/student/dashboard')
        this.profile = data.profile
        this.drives = data.drives
        this.applications = data.applications
      } catch (err) {
        this.pageMsg = { text: err.data?.error || 'Failed to load dashboard.', type: 'danger' }
      }
      this.loading = false
    },

    async loadApplications() {
      try {
        this.applications = await api.get('/api/student/applications')
      } catch (err) {
        this.pageMsg = { text: err.data?.error || 'Failed to load applications.', type: 'danger' }
      }
    },

    // ── Apply ─────────────────────────────────────────────────────────────
    async applyToDrive(drive) {
      this.applyMsg = { driveId: drive.id, text: '', type: '' }
      try {
        await api.post(`/api/student/drives/${drive.id}/apply`)
        drive.already_applied = true
        this.applyMsg = { driveId: drive.id, text: 'Applied!', type: 'success' }
        await this.loadApplications()
      } catch (err) {
        this.applyMsg = { driveId: drive.id, text: err.data?.error || 'Failed to apply.', type: 'danger' }
      }
    },

    // ── CSV Export ────────────────────────────────────────────────────────
    async triggerExport() {
      this.exportLoading = true
      this.exportStatus = null
      this.exportMsg = { text: '', type: '' }
      try {
        const res = await api.post('/api/student/export-applications')
        this.exportTaskId = res.task_id
        this.exportStatus = 'pending'
        this._pollExport()
      } catch (err) {
        this.exportMsg = { text: err.data?.error || 'Export failed.', type: 'danger' }
      }
      this.exportLoading = false
    },

    async downloadExport() {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/student/download-export', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) {
          this.exportMsg = { text: 'Download failed — try exporting again.', type: 'danger' }
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'my_applications.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (_) {
        this.exportMsg = { text: 'Download failed.', type: 'danger' }
      }
    },

    _pollExport() {
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        if (attempts > 30) {          // 60 s timeout
          this.exportStatus = 'failed'
          this.exportMsg = { text: 'Export timed out. Is the Celery worker running?', type: 'danger' }
          clearInterval(interval)
          return
        }
        try {
          const res = await api.get(`/api/student/export-applications/${this.exportTaskId}`)
          if (res.status === 'done') {
            this.exportStatus = 'done'
            this.exportMsg = { text: `CSV ready — ${res.count} record(s). Click Download.`, type: 'success' }
            clearInterval(interval)
          } else if (res.status === 'failed') {
            this.exportStatus = 'failed'
            this.exportMsg = { text: `Export failed: ${res.error || 'Unknown error'}`, type: 'danger' }
            clearInterval(interval)
          }
          // status === 'pending' → keep polling
        } catch (err) {
          this.exportStatus = 'failed'
          this.exportMsg = { text: err.data?.error || 'Polling failed.', type: 'danger' }
          clearInterval(interval)
        }
      }, 2000)
    }
  },
  mounted() {
    this.userEmail = localStorage.getItem('userEmail') || ''
    this.loadDashboard()
  }
}
