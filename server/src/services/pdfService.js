const PDFDocument = require('pdfkit');

function buildPDF(quiz, res, withAnswers = false) {
    // A4 height is roughly 841 points.
    // Margin 30 -> Printable bottom is around 810.
    const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true
    });

    const filename = `Quiz-${quiz.title.replace(/[^a-z0-9]/gi, '_')}${withAnswers ? '_Correction' : ''}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // --- EN-TÊTE ---
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000')
        .text(quiz.title, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(565, doc.y).lineWidth(0.5).strokeColor('#9ca3af').stroke();
    doc.moveDown(1);

    // --- CORPS DU QUIZ ---
    quiz.questions.forEach((q, index) => {

        // CORRECTION DU BUG DES PAGES BLANCHES :
        // On calcule l'espace restant. Si on est trop près du bas (moins de 100pts),
        // on force une nouvelle page proprement. Sinon, on laisse PDFKit gérer.
        const spaceRemaining = doc.page.height - doc.y - doc.page.margins.bottom;

        if (spaceRemaining < 100) {
            doc.addPage();
        }

        // 1. La Question
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000')
            .text(`${index + 1}. ${q.text}`, { width: 535 });

        doc.moveDown(0.3);

        // 2. Les Options
        doc.font('Helvetica').fontSize(10);

        q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            let prefix = `( ) ${letter}.`;
            let textColor = '#000000';
            let font = 'Helvetica';

            if (withAnswers) {
                if (opt.isCorrect) {
                    prefix = `[X] ${letter}.`;
                    font = 'Helvetica-Bold';
                } else {
                    textColor = '#6b7280';
                }
            }

            // On s'assure que l'option ne casse pas la page toute seule
            if (doc.y > doc.page.height - 50) doc.addPage();

            doc.font(font).fillColor(textColor)
                .text(`${prefix} ${opt.text}`, { indent: 15 });

            doc.moveDown(0.2);
        });

        // 3. Explication
        if (withAnswers && q.explanation) {
            doc.moveDown(0.3);
            const startY = doc.y;

            // Vérif saut de page pour l'explication
            if (startY > doc.page.height - 60) doc.addPage();

            doc.moveTo(40, doc.y).lineTo(40, doc.y + 12).lineWidth(1).strokeColor('#d1d5db').stroke();
            doc.font('Helvetica-Oblique').fontSize(9).fillColor('#4b5563')
                .text(`Note : ${q.explanation}`, 45, doc.y, { width: 500 });
        }

        // Espace entre questions (Sauf pour la dernière)
        if (index < quiz.questions.length - 1) {
            doc.moveDown(1.2);
        }
    });

    // --- PIED DE PAGE ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // On place le footer plus haut (790) pour éviter de créer une page fantôme
        doc.fontSize(8).fillColor('#9ca3af')
            .text(`${i + 1} / ${range.count}`, 530, 790, { align: 'right' });
    }

    doc.end();
}

module.exports = { buildPDF };