import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PublicQuizView from './PublicQuizView.vue'
import { useRoute } from 'vue-router'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

describe('PublicQuizView.vue', () => {
  beforeEach(() => {
    useRoute.mockReturnValue({ params: { uuid: 'uuid-123' } })
    global.fetch = vi.fn()
  })

  it('renders loading state initially', () => {
    fetch.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(PublicQuizView)
    expect(wrapper.text()).toContain('Chargement')
  })

  it('transitions from intro to playing after entering pseudo', async () => {
    const mockQuiz = {
      title: 'Math Quiz',
      difficulty: 'Facile',
      questions: [
        {
          id: 1,
          text: '1+1?',
          options: [
            { id: 1, text: '2', isCorrect: true },
            { id: 2, text: '3', isCorrect: false }
          ]
        }
      ]
    }
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockQuiz)
    })

    const wrapper = mount(PublicQuizView)
    
    await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Math Quiz')
    })

    // Enter pseudo and start
    await wrapper.find('input[placeholder="Ex: SuperMario"]').setValue('Tester')
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Question 1/1')
    expect(wrapper.text()).toContain('1+1?')
  })
})
