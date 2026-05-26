const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginPage, meta: { guestOnly: true } },
  { path: '/register/student', component: RegisterStudent, meta: { guestOnly: true } },
  { path: '/register/company', component: RegisterCompany, meta: { guestOnly: true } },

  { path: '/admin/dashboard',   component: AdminDashboard,   meta: { requiresAuth: true, role: 'admin' } },
  { path: '/company/dashboard', component: CompanyDashboard, meta: { requiresAuth: true, role: 'company' } },
  { path: '/student/dashboard', component: { template: '<div class="container mt-5"><h2>Student Dashboard — coming Week 3</h2></div>' }, meta: { requiresAuth: true, role: 'student' } },

  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (to.meta.requiresAuth && !token) {
    return next('/login')
  }

  if (to.meta.requiresAuth && to.meta.role && to.meta.role !== role) {
    // Redirect to correct dashboard if role mismatch
    return next(`/${role}/dashboard`)
  }

  if (to.meta.guestOnly && token) {
    // Already logged in — send to their dashboard
    return next(`/${role}/dashboard`)
  }

  next()
})
