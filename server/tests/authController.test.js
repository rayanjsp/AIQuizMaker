const { register, login } = require('../src/controllers/authController');
const { prismaMock } = require('./setup');
const jwt = require('jsonwebtoken');

describe('authController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('register', () => {
        it('should return 400 if fields are missing', async () => {
            req.body = { email: 'test@test.com' }; // Missing username and password
            await register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Tous les champs sont obligatoires" });
        });

        it('should return 400 for invalid email format', async () => {
            req.body = { email: 'invalid-email', password: 'Password1', username: 'testuser' };
            await register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Format d'email invalide" });
        });

        it('should return 400 for invalid password format', async () => {
            req.body = { email: 'test@test.com', password: '123', username: 'testuser' };
            await register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Le mot de passe doit contenir entre 6 et 30 caractères, avec au moins une majuscule, une minuscule et un chiffre."
            });
        });

        it('should return 400 if email is already used', async () => {
            req.body = { email: 'exists@test.com', password: 'Password1', username: 'testuser' };
            prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'exists@test.com' });

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Cet email est déjà utilisé" });
        });

        it('should create a new user and return a token on success', async () => {
            req.body = { email: 'new@test.com', password: 'Password1', username: 'newuser' };
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({
                id: 1,
                email: 'new@test.com',
                username: 'newuser'
            });

            await register(req, res);

            expect(prismaMock.user.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Compte créé et connecté avec succès !",
                token: expect.any(String),
                username: 'newuser'
            }));
        });
    });

    describe('login', () => {
        it('should return 400 if fields are missing', async () => {
            req.body = { email: 'test@test.com' };
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Champs manquants" });
        });

        it('should return 401 if user not found', async () => {
            req.body = { email: 'notfound@test.com', password: 'Password1' };
            prismaMock.user.findUnique.mockResolvedValue(null);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Mot de passe ou e-mail incorrect" });
        });

        // For correct password testing, we'd need to mock the hashing or reuse the logic.
        // Since hashPassword is not exported, we can't easily generate a matching hash here
        // without duplicating the logic.
    });
});
