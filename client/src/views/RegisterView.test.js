import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterView from './RegisterView.vue'
import { useRouter } from 'vue-router'

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

describe('RegisterView.vue', () => {
  let pushMock
  
  beforeEach(() => {
    pushMock = vi.fn()
    useRouter.mockReturnValue({ push: pushMock })
    global.fetch = vi.fn()
    global.localStorage = {
      setItem: vi.fn()
    }
  })

  it('renders correctly', () => {
    const wrapper = mount(RegisterView)
    expect(wrapper.find('h2').text()).toBe('Créer un compte')
  })

  it('submits registration successfully', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'fake-token', username: 'testuser' })
    })

    const wrapper = mount(RegisterView)
    await wrapper.find('input[placeholder="Ton pseudo"]').setValue('testuser')
    await wrapper.find('input[placeholder="exemple@email.com"]').setValue('test@test.com')
    await wrapper.find('input[placeholder="********"]').setValue('Password123')
    
    // Mock window.alert
    global.alert = vi.fn()

    await wrapper.find('form').trigger('submit')
    
    await vi.waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token')
  })
})
