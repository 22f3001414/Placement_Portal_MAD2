const Navbar = {
  name: 'Navbar',
  props: {
    role: { type: String, default: '' },
    userEmail: { type: String, default: '' }
  },
  data() {
    return { loggingOut: false }
  },
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div class="container-fluid px-4">

        <span class="navbar-brand fw-bold">
          <i class="bi bi-building-check me-2"></i>Placement Portal
        </span>

        <div class="d-flex align-items-center gap-3">
          <span v-if="userEmail" class="text-white-50 small d-none d-md-inline">
            <i class="bi bi-person-circle me-1"></i>{{ userEmail }}
            <span v-if="role" class="badge ms-2"
              :class="{
                'bg-danger': role === 'admin',
                'bg-warning text-dark': role === 'company',
                'bg-success': role === 'student'
              }">
              {{ role }}
            </span>
          </span>

          <button
            class="btn btn-outline-light btn-sm"
            @click="logout"
            :disabled="loggingOut"
          >
            <span v-if="loggingOut" class="spinner-border spinner-border-sm me-1" role="status"></span>
            <i v-else class="bi bi-box-arrow-right me-1"></i>
            Logout
          </button>
        </div>

      </div>
    </nav>
  `,
  methods: {
    async logout() {
      this.loggingOut = true
      try {
        await api.post('/api/auth/logout')
      } catch (_) { /* stateless logout, ignore errors */ }
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      this.$router.push('/login')
    }
  }
}
