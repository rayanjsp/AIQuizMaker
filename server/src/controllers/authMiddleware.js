const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cle_secrete_temporaire';

module.exports = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "Accès refusé. Authentification requise." });
        }
        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, JWT_SECRET);

        req.user = decodedToken;

        next();

    } catch (error) {
        res.status(401).json({ message: "Session expirée ou invalide." });
    }
};