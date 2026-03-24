import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginView from './LoginView.vue'
import { useRouter } from 'vue-router'

vi.mock('vue-router', () => ({
  useRouter: vi.fn()
}))

describe('LoginView.vue', () => {
  let pushMock
  
  beforeEach(() => {
    pushMock = vi.fn()
    useRouter.mockReturnValue({ push: pushMock })
    // Mock global fetch
    global.fetch = vi.fn()
    // Mock localStorage
    global.localStorage = {
      setItem: vi.fn(),
      clear: vi.fn()
    }
  })

  it('renders correctly', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.find('h2').text()).toBe('Connexion')
    expect(wrapper.find('button').text()).toBe('Se connecter')
  })

  it('shows error message on failed login', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Identifiants invalides' })
    })

    const wrapper = mount(LoginView)
    await wrapper.find('input[type="email"]').setValue('test@test.com')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit')

    // Wait for the async login to finish
    await vi.waitFor(() => {
        expect(wrapper.find('.text-red-700').exists()).toBe(true)
    })
    expect(wrapper.find('.text-red-700').text()).toBe('Identifiants invalides')
  })

  it('redirects to dashboard on successful login', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'fake-token', username: 'testuser' })
    })

    const wrapper = mount(LoginView)
    await wrapper.find('input[type="email"]').setValue('test@test.com')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token')
  })
})
