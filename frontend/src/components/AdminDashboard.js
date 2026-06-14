const AdminDashboard = {
  name: 'AdminDashboard',
  components: { Navbar },
  data() {
    return {
      activeTab: 'overview',
      userEmail: localStorage.getItem('userEmail') || '',

      // Overview
      stats: { students: 0, companies: 0, drives: 0 },
      statsLoading: true,
      chartStats: null,
      charts: { appStatus: null, driveStatus: null },

      // Companies
      companies: [],
      companiesLoading: false,
      companySearch: '',
      companyMsg: { text: '', type: '' },

      // Students
      students: [],
      studentsLoading: false,
      studentSearch: '',
      studentMsg: { text: '', type: '' },

      // Drives
      drives: [],
      drivesLoading: false,
      driveMsg: { text: '', type: '' },
      expandedDriveId: null,
      driveApplicants: [],
      applicantsLoading: false
    }
  },
  template: `
    <div>
      <Navbar role="admin" :userEmail="userEmail" />

      <div class="container-fluid py-4 px-4">
        <h4 class="fw-bold mb-4">Admin Dashboard</h4>

        <!-- Tabs -->
        <ul class="nav nav-tabs mb-4">
          <li class="nav-item">
            <a class="nav-link" :class="{active: activeTab==='overview'}" href="#" @click.prevent="switchTab('overview')">
              <i class="bi bi-speedometer2 me-1"></i>Overview
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" :class="{active: activeTab==='companies'}" href="#" @click.prevent="switchTab('companies')">
              <i class="bi bi-buildings me-1"></i>Companies
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" :class="{active: activeTab==='students'}" href="#" @click.prevent="switchTab('students')">
              <i class="bi bi-mortarboard me-1"></i>Students
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" :class="{active: activeTab==='drives'}" href="#" @click.prevent="switchTab('drives')">
              <i class="bi bi-briefcase me-1"></i>Drives
            </a>
          </li>
        </ul>

        <!-- ── OVERVIEW ── -->
        <div v-if="activeTab==='overview'">
          <div v-if="statsLoading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>
          <div v-else>
            <div class="row g-4">
              <div class="col-md-4">
                <div class="card text-center border-0 shadow-sm h-100">
                  <div class="card-body py-4">
                    <i class="bi bi-mortarboard text-success" style="font-size:2.5rem"></i>
                    <h2 class="fw-bold mt-2 mb-0">{{ stats.students }}</h2>
                    <p class="text-muted mb-0">Total Students</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card text-center border-0 shadow-sm h-100">
                  <div class="card-body py-4">
                    <i class="bi bi-buildings text-warning" style="font-size:2.5rem"></i>
                    <h2 class="fw-bold mt-2 mb-0">{{ stats.companies }}</h2>
                    <p class="text-muted mb-0">Total Companies</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card text-center border-0 shadow-sm h-100">
                  <div class="card-body py-4">
                    <i class="bi bi-briefcase text-primary" style="font-size:2.5rem"></i>
                    <h2 class="fw-bold mt-2 mb-0">{{ stats.drives }}</h2>
                    <p class="text-muted mb-0">Total Drives</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Charts row -->
            <div v-if="chartStats" class="row g-4 mt-1">
              <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                  <div class="card-body">
                    <h6 class="fw-semibold mb-3 text-center text-muted">Application Status Breakdown</h6>
                    <canvas ref="appChart" style="max-height:260px"></canvas>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                  <div class="card-body">
                    <h6 class="fw-semibold mb-3 text-center text-muted">Drives by Status</h6>
                    <canvas ref="driveChart" style="max-height:260px"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── COMPANIES ── -->
        <div v-if="activeTab==='companies'">
          <div class="d-flex gap-2 mb-3">
            <input v-model="companySearch" type="text" class="form-control w-auto" placeholder="Search by name or email…" @keyup.enter="loadCompanies" />
            <button class="btn btn-outline-secondary" @click="loadCompanies">
              <i class="bi bi-search"></i>
            </button>
          </div>

          <div v-if="companyMsg.text" class="alert" :class="'alert-' + companyMsg.type" role="alert">
            {{ companyMsg.text }}
          </div>

          <div v-if="companiesLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
          </div>
          <div v-else-if="companies.length === 0" class="text-muted">No companies found.</div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-dark">
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>HR Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in companies" :key="c.id">
                  <td class="fw-semibold">{{ c.company_name }}</td>
                  <td>{{ c.email }}</td>
                  <td>{{ c.hr_contact || '—' }}</td>
                  <td>
                    <span class="badge" :class="statusBadge(c.approval_status)">
                      {{ c.approval_status }}
                    </span>
                    <span v-if="c.is_blacklisted" class="badge bg-dark ms-1">Blacklisted</span>
                    <span v-if="!c.is_active" class="badge bg-secondary ms-1">Inactive</span>
                  </td>
                  <td>
                    <div class="d-flex flex-wrap gap-1">
                      <button v-if="c.approval_status !== 'approved'" class="btn btn-success btn-sm" @click="companyAction(c.id, 'approve')">Approve</button>
                      <button v-if="c.approval_status !== 'rejected'" class="btn btn-danger btn-sm" @click="companyAction(c.id, 'reject')">Reject</button>
                      <button v-if="!c.is_blacklisted" class="btn btn-dark btn-sm" @click="companyAction(c.id, 'blacklist')">Blacklist</button>
                      <button v-if="c.is_active" class="btn btn-secondary btn-sm" @click="companyAction(c.id, 'deactivate')">Deactivate</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── STUDENTS ── -->
        <div v-if="activeTab==='students'">
          <div class="d-flex gap-2 mb-3">
            <input v-model="studentSearch" type="text" class="form-control w-auto" placeholder="Search by name or email…" @keyup.enter="loadStudents" />
            <button class="btn btn-outline-secondary" @click="loadStudents">
              <i class="bi bi-search"></i>
            </button>
          </div>

          <div v-if="studentMsg.text" class="alert" :class="'alert-' + studentMsg.type" role="alert">
            {{ studentMsg.text }}
          </div>

          <div v-if="studentsLoading" class="text-center py-4">
            <div class="spinner-border text-success" role="status"></div>
          </div>
          <div v-else-if="students.length === 0" class="text-muted">No students found.</div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in students" :key="s.id">
                  <td class="fw-semibold">{{ s.name }}</td>
                  <td>{{ s.email }}</td>
                  <td>{{ s.branch || '—' }}</td>
                  <td>{{ s.cgpa != null ? s.cgpa : '—' }}</td>
                  <td>{{ s.year || '—' }}</td>
                  <td>
                    <span v-if="s.is_blacklisted" class="badge bg-dark">Blacklisted</span>
                    <span v-else-if="!s.is_active" class="badge bg-secondary">Inactive</span>
                    <span v-else class="badge bg-success">Active</span>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <button v-if="!s.is_blacklisted" class="btn btn-dark btn-sm" @click="studentAction(s.id, 'blacklist')">Blacklist</button>
                      <button v-if="s.is_active" class="btn btn-secondary btn-sm" @click="studentAction(s.id, 'deactivate')">Deactivate</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── DRIVES ── -->
        <div v-if="activeTab==='drives'">
          <div v-if="driveMsg.text" class="alert" :class="'alert-' + driveMsg.type" role="alert">
            {{ driveMsg.text }}
          </div>

          <div v-if="drivesLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
          </div>
          <div v-else-if="drives.length === 0" class="text-muted">No drives found.</div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-dark">
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Deadline</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="d in drives" :key="d.id">
                  <tr :class="{'table-active': expandedDriveId === d.id}" style="cursor:pointer" @click="toggleApplicants(d.id)">
                    <td class="fw-semibold">{{ d.job_title }}</td>
                    <td>{{ d.company_name }}</td>
                    <td>{{ d.deadline ? d.deadline.slice(0,10) : '—' }}</td>
                    <td><span class="badge bg-secondary">{{ d.applicant_count }}</span></td>
                    <td>
                      <span class="badge" :class="statusBadge(d.status)">{{ d.status }}</span>
                    </td>
                    <td @click.stop>
                      <div class="d-flex gap-1">
                        <button v-if="d.status !== 'approved'" class="btn btn-success btn-sm" @click="driveAction(d.id, 'approve')">Approve</button>
                        <button v-if="d.status !== 'rejected'" class="btn btn-danger btn-sm" @click="driveAction(d.id, 'reject')">Reject</button>
                      </div>
                    </td>
                  </tr>
                  <!-- Applicants sub-row -->
                  <tr v-if="expandedDriveId === d.id">
                    <td colspan="6" class="bg-light p-0">
                      <div class="p-3">
                        <h6 class="fw-bold mb-2">Applicants for: {{ d.job_title }}</h6>
                        <div v-if="applicantsLoading" class="text-center py-2">
                          <div class="spinner-border spinner-border-sm" role="status"></div>
                        </div>
                        <div v-else-if="driveApplicants.length === 0" class="text-muted small">No applicants yet.</div>
                        <table v-else class="table table-sm table-bordered mb-0">
                          <thead class="table-secondary">
                            <tr>
                              <th>Name</th>
                              <th>Branch</th>
                              <th>CGPA</th>
                              <th>Applied</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="a in driveApplicants" :key="a.application_id">
                              <td>{{ a.name }}</td>
                              <td>{{ a.branch || '—' }}</td>
                              <td>{{ a.cgpa != null ? a.cgpa : '—' }}</td>
                              <td>{{ a.applied_date ? a.applied_date.slice(0,10) : '—' }}</td>
                              <td><span class="badge" :class="appStatusBadge(a.status)">{{ a.status }}</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `,
  methods: {
    switchTab(tab) {
      this.activeTab = tab
      this.expandedDriveId = null
      if (tab === 'companies') this.loadCompanies()
      else if (tab === 'students') this.loadStudents()
      else if (tab === 'drives') this.loadDrives()
      else if (tab === 'overview' && this.chartStats) {
        this.$nextTick(() => this.renderCharts())
      }
    },

    statusBadge(status) {
      return {
        'bg-warning text-dark': status === 'pending',
        'bg-success': status === 'approved',
        'bg-danger': status === 'rejected'
      }
    },

    appStatusBadge(status) {
      return {
        'bg-secondary': status === 'applied',
        'bg-warning text-dark': status === 'shortlisted',
        'bg-success': status === 'selected',
        'bg-danger': status === 'rejected'
      }
    },

    async loadStats() {
      this.statsLoading = true
      try {
        const [data, chartData] = await Promise.all([
          api.get('/api/admin/dashboard'),
          api.get('/api/admin/stats')
        ])
        this.stats = data
        this.chartStats = chartData
      } catch (_) {}
      this.statsLoading = false
      this.$nextTick(() => this.renderCharts())
    },

    renderCharts() {
      const appCtx = this.$refs.appChart
      if (appCtx && this.chartStats) {
        if (this.charts.appStatus) this.charts.appStatus.destroy()
        const d = this.chartStats.application_status
        this.charts.appStatus = new Chart(appCtx, {
          type: 'doughnut',
          data: {
            labels: ['Applied', 'Shortlisted', 'Selected', 'Rejected'],
            datasets: [{
              data: [d.applied || 0, d.shortlisted || 0, d.selected || 0, d.rejected || 0],
              backgroundColor: ['#6c757d', '#ffc107', '#198754', '#dc3545'],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
          }
        })
      }

      const driveCtx = this.$refs.driveChart
      if (driveCtx && this.chartStats) {
        if (this.charts.driveStatus) this.charts.driveStatus.destroy()
        const d = this.chartStats.drive_status
        this.charts.driveStatus = new Chart(driveCtx, {
          type: 'bar',
          data: {
            labels: ['Pending', 'Approved', 'Closed', 'Rejected'],
            datasets: [{
              label: 'Drives',
              data: [d.pending || 0, d.approved || 0, d.closed || 0, d.rejected || 0],
              backgroundColor: ['#ffc107', '#198754', '#6c757d', '#dc3545'],
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
          }
        })
      }
    },

    async loadCompanies() {
      this.companiesLoading = true
      try {
        const q = this.companySearch.trim()
        this.companies = await api.get('/api/admin/companies' + (q ? `?q=${encodeURIComponent(q)}` : ''))
      } catch (_) {}
      this.companiesLoading = false
    },

    async companyAction(id, action) {
      try {
        const res = await api.put(`/api/admin/companies/${id}/${action}`)
        this.companyMsg = { text: res.message, type: 'success' }
        await this.loadCompanies()
      } catch (err) {
        this.companyMsg = { text: err.data?.error || 'Action failed.', type: 'danger' }
      }
      setTimeout(() => { this.companyMsg = { text: '', type: '' } }, 3000)
    },

    async loadStudents() {
      this.studentsLoading = true
      try {
        const q = this.studentSearch.trim()
        this.students = await api.get('/api/admin/students' + (q ? `?q=${encodeURIComponent(q)}` : ''))
      } catch (_) {}
      this.studentsLoading = false
    },

    async studentAction(id, action) {
      try {
        const res = await api.put(`/api/admin/students/${id}/${action}`)
        this.studentMsg = { text: res.message, type: 'success' }
        await this.loadStudents()
      } catch (err) {
        this.studentMsg = { text: err.data?.error || 'Action failed.', type: 'danger' }
      }
      setTimeout(() => { this.studentMsg = { text: '', type: '' } }, 3000)
    },

    async loadDrives() {
      this.drivesLoading = true
      try {
        this.drives = await api.get('/api/admin/drives')
      } catch (_) {}
      this.drivesLoading = false
    },

    async driveAction(id, action) {
      try {
        const res = await api.put(`/api/admin/drives/${id}/${action}`)
        this.driveMsg = { text: res.message, type: 'success' }
        await this.loadDrives()
      } catch (err) {
        this.driveMsg = { text: err.data?.error || 'Action failed.', type: 'danger' }
      }
      setTimeout(() => { this.driveMsg = { text: '', type: '' } }, 3000)
    },

    async toggleApplicants(driveId) {
      if (this.expandedDriveId === driveId) {
        this.expandedDriveId = null
        this.driveApplicants = []
        return
      }
      this.expandedDriveId = driveId
      this.driveApplicants = []
      this.applicantsLoading = true
      try {
        this.driveApplicants = await api.get(`/api/admin/drives/${driveId}/applications`)
      } catch (_) {}
      this.applicantsLoading = false
    }
  },
  mounted() {
    this.userEmail = localStorage.getItem('userEmail') || ''
    this.loadStats()
  }
}
