const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { PdfReader } = require('pdfreader');

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

function extrairTextoPuroPdfBuffer(buffer) {
    return new Promise((resolve, reject) => {
        let textoAcumulado = "";
        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) reject(err);
            else if (!item) resolve(textoAcumulado);
            else if (item.text) textoAcumulado += item.text + " ";
        });
    });
}

app.post('/api/taxas', upload.single('arquivoPdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({erro: 'Nenhum arquivo enviado.'});
        }

        const textoBruto = await extrairTextoPuroPdfBuffer(req.file.buffer);
        const textoLimpo = textoBruto.replace(/[\s\r\n\\]/g, '');

        const padraoValoresNegativos = /R\$-([\d.,]+)/g;
        let totalTaxas = 0;
        let quantidadeTaxas = 0;
        let match;

        while ((match = padraoValoresNegativos.exec(textoLimpo)) !== null) {
            let valorStr = match[1];
            let valorlimpoNum = valorStr.replace(/\./g, '').replace(',', '.');
            let valorFloat = parseFloat(valorlimpoNum);

            if (!isNaN(valorFloat) && valorFloat < 10) {
                totalTaxas += valorFloat;
                quantidadeTaxas++;
            }
        }

        res.json({
            quantidade: quantidadeTaxas,
            totalFormatado: totalTaxas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})
        });

    } catch (error) {
        console.error('Erro na API:', erro);
        res.status(500).json({erro: 'Erro interno ao processar o PDF.'});
    }
});

const PORTA = 3001;
app.listen(PORTA, () => {
    console.log(`Back-end (API) rodando na porta ${PORTA}`);
});