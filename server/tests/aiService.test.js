process.env.AI_PROVIDER = 'deepseek';
process.env.DEEPSEEK_API_KEY = 'test-key';

const mockCreate = jest.fn();

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => {
        return {
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        };
    });
});

const { generateQuiz, aiAssist } = require('../src/services/aiService');

describe('aiService', () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });

    describe('generateQuiz', () => {
        it('should return parsed quiz data from OpenAI', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            {
                                text: 'Question 1',
                                explanation: 'Exp 1',
                                options: [
                                    { text: 'O1', isCorrect: true },
                                    { text: 'O2', isCorrect: false }
                                ]
                            }
                        ])
                    }
                }]
            };
            mockCreate.mockResolvedValue(mockResponse);

            const result = await generateQuiz('Topic', 'Facile', 5);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('Question 1');
            expect(mockCreate).toHaveBeenCalled();
        });

        it('should throw error if no valid JSON is found', async () => {
            mockCreate.mockResolvedValue({
                choices: [{ message: { content: 'No JSON here' } }]
            });

            await expect(generateQuiz('Topic', 'Facile')).rejects.toThrow("Aucun JSON valide");
        });
    });

    describe('aiAssist', () => {
        it('should generate a single question', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            text: 'AI Question',
                            explanation: 'Exp',
                            options: [{ text: 'Yes', isCorrect: true }]
                        })
                    }
                }]
            };
            mockCreate.mockResolvedValue(mockResponse);

            const result = await aiAssist('question', 'Some context');

            expect(result.text).toBe('AI Question');
        });

        it('should generate options', async () => {
             const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            { text: 'Opt1', isCorrect: true },
                            { text: 'Opt2', isCorrect: false }
                        ])
                    }
                }]
            };
            mockCreate.mockResolvedValue(mockResponse);

            const result = await aiAssist('options', 'Question context');

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
        });
    });
});
