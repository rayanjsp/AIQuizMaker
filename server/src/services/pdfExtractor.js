const fs = require('fs');
const path = require('path');
const pdfLibrary = require('pdf-parse');

async function extractTextFromPDF(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        console.log("📂 Fichier cible :", absolutePath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error("Fichier introuvable sur le disque");
        }

        const dataBuffer = fs.readFileSync(absolutePath);
        let data;

        // --- LOGIQUE D'ADAPTATION (CORRIGÉE) ---

        if (typeof pdfLibrary === 'function') {
            // Cas 1 : Fonction standard
            data = await pdfLibrary(dataBuffer);
        }
        else if (pdfLibrary.PDFParse) {
            // Cas 2 : Classe (C'est ton cas !)
            console.log("✅ Mode Classe détecté. Instanciation avec 'new'...");

            // L'erreur disait : "Use 'new'". On obéit.
            const parserInstance = new pdfLibrary.PDFParse(dataBuffer);

            // Dans ce mode bizarre, l'instance est souvent une Promesse déguisée ou contient direct les data
            if (parserInstance instanceof Promise || typeof parserInstance.then === 'function') {
                data = await parserInstance;
            } else {
                data = parserInstance;
            }
        }
        else if (pdfLibrary.default) {
            // Cas 3 : Import par défaut
            if (typeof pdfLibrary.default === 'function') {
                data = await pdfLibrary.default(dataBuffer);
            } else {
                // Si le default est aussi une classe...
                data = new pdfLibrary.default(dataBuffer);
            }
        }
        else {
            throw new Error("Format de librairie inconnu.");
        }

        // --- VÉRIFICATION DU RÉSULTAT ---
        if (!data || typeof data.text === 'undefined') {
            console.log("⚠️ Résultat brut reçu :", data);
            throw new Error("Le PDF a été lu mais aucun texte n'a été trouvé.");
        }

        console.log("✅ Succès ! Texte extrait :", data.text.length, "caractères.");

        // Nettoyage
        return data.text.replace(/\n/g, " ").replace(/\s+/g, " ");

    } catch (error) {
        console.error("💥 ERREUR EXTRACTION :", error);
        throw new Error("Échec lecture PDF : " + error.message);
    } finally {
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
        }
    }
}

module.exports = { extractTextFromPDF };