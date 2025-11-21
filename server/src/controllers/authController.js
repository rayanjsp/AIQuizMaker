const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'cle_secrete_temporaire';

function hashPassword(password, salt) {
    return crypto.createHmac('sha512', salt)
        .update(password)
        .digest('hex');
}

exports.register = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const username = req.body.username;

        // 1. Validation
        if (!email || !password || !username) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Format d'email invalide" });
        }

        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,30}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Le mot de passe doit contenir entre 6 et 30 caractères, avec au moins une majuscule, une minuscule et un chiffre."
            });
        }

        // 2. Vérifier doublon
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }

        // 3. Création
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);

        const newUser = await prisma.user.create({
            data: {
                email: email,
                password: hash,
                username: username,
                salt: salt,
            }
        });

        // --- 4. AUTO-LOGIN (C'est ici la nouveauté) ---
        // On crée le badge tout de suite pour le nouvel utilisateur
        const token = jwt.sign(
            { userId: newUser.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // On renvoie le token directement
        res.status(201).json({
            message: "Compte créé et connecté avec succès !",
            token: token,
            username: newUser.username
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
};
exports.login = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ message: "Champs manquants" });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: "Mot de passe ou e-mail incorrect" });
        }

        const saltStored = user.salt;
        const hash = hashPassword(password, saltStored);

        if (hash !== user.password) {
            return res.status(401).json({ message: "Mot de passe ou e-mail incorrect" });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ message: "Connexion réussie", token, username: user.username });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erreur lors de la connexion" });
    }
};