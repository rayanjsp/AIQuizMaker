import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterView from './RegisterView.vue'
import { useRouter } from 'vue-router'

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  RouterLink: { template: '<a><slot /></a>' }
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    register: vi.fn().mockResolvedValue(undefined)
  })
}))

describe('RegisterView.vue', () => {
  let pushMock

  beforeEach(() => {
    pushMock = vi.fn()
    useRouter.mockReturnValue({ push: pushMock })
  })

  it('renders correctly', () => {
    const wrapper = mount(RegisterView)
    expect(wrapper.find('h2').text()).toBe('Créer un compte')
  })

  it('submits registration and redirects to /login', async () => {
    const wrapper = mount(RegisterView)
    await wrapper.find('input[placeholder="Ton pseudo"]').setValue('testuser')
    await wrapper.find('input[placeholder="exemple@email.com"]').setValue('test@test.com')
    await wrapper.find('input[placeholder="********"]').setValue('Password123')

    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login')
    })
  })
})
