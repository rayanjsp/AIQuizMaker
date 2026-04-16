process.env.DEEPSEEK_API_KEY = 'dummy_key';
process.env.JWT_SECRET = 'test-secret';
const { mockDeep, mockReset } = require('jest-mock-extended');

const prismaMock = mockDeep();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

module.exports = { prismaMock };
