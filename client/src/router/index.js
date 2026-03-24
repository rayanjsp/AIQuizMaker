import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const HomeView = () => import('../views/HomeView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const LoginView = () => import('../views/LoginView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const PublicQuizView = () => import('../views/PublicQuizView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/play/:uuid',
      name: 'public-game',
      component: PublicQuizView
    }
  ]
})

router.beforeEach((to) => {
  const { isLoggedIn } = useAuth()
  if (to.path === '/dashboard' && !isLoggedIn()) {
    return '/login'
  }
})

export default router
