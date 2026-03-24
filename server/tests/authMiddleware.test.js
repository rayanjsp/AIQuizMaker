const authMiddleware = require('../src/controllers/authMiddleware');
const jwt = require('jsonwebtoken');

describe('authMiddleware', () => {
    let req, res, next;
    const JWT_SECRET = process.env.JWT_SECRET || 'cle_secrete_temporaire';

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    it('should return 401 if no authorization header is present', () => {
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Accès refusé. Authentification requise." });
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() and attach user if token is valid', () => {
        const payload = { userId: 1 };
        const token = jwt.sign(payload, JWT_SECRET);
        req.headers.authorization = `Bearer ${token}`;

        authMiddleware(req, res, next);

        expect(req.user).toMatchObject(payload);
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
        req.headers.authorization = 'Bearer invalidtoken';

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Session expirée ou invalide." });
        expect(next).not.toHaveBeenCalled();
    });
});
