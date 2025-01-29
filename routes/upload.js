const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');
const moment = require('moment');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const formatCurrency = (value) =>
  value ? parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.')) || 0 : 0;

const formatDate = (date) => {
  if (!date || date.trim() === '' || date === '01/01/0001 00:00:00') {
    console.warn('⚠️ Data inválida detectada:', date);
    return null;
  }

  date = date.trim();
  const parsedDate = moment(date, ['DD/MM/YYYY HH:mm', 'DD/MM/YYYY', 'DD-MM-YYYY HH:mm', 'DD-MM-YYYY'], true);

  if (!parsedDate.isValid()) {
    console.error('❌ Erro ao converter data:', date);
    return null;
  }

  return parsedDate.format('YYYY-MM-DD');
};

router.post('/upload', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  const filePath = path.join(__dirname, '../uploads', req.file.filename);
  const results = [];
  let lineCount = 0;
  let columnMapping = {};

  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';', headers: false }))
    .on('data', (data) => {
      console.log('Linha bruta do CSV:', data);
      lineCount++;

      // Mapeia as colunas na terceira linha
      if (lineCount === 2) {
        columnMapping = {
          0: 'stonecode',
          1: 'datadavenda',
          2: 'bandeira',
          3: 'produto',
          4: 'stoneid',
          5: 'qtddeparcelas',
          6: 'valorbruto',
          7: 'valorliquido',
          8: 'descontodemdr',
          9: 'descontodeantecipacao',
          10: 'numerocartao',
          11: 'meiodecaptura',
          12: 'numeroserie',
          13: 'ultimostatus',
          14: 'dataultimostatus',
        };
        console.log('📌 Cabeçalhos detectados:', columnMapping);
        return;
      }

      // Pula a primeira e segunda linha
      if (lineCount === 1 || lineCount === 2) return;

      results.push({
        stonecode: data[0] || null,
        datadavenda: formatDate(data[1]),
        bandeira: data[2] || null,
        produto: data[3] || null,
        stoneid: data[4] || null,
        qtddeparcelas: parseInt(data[5]) || null,
        valorbruto: formatCurrency(data[6]),
        valorliquido: formatCurrency(data[7]),
        descontodemdr: formatCurrency(data[8]),
        descontodeantecipacao: formatCurrency(data[9]),
        numerocartao: data[10] || null,
        meiodecaptura: data[11] || null,
        numeroserie: data[12] || null,
        ultimostatus: data[13] || null,
        dataultimostatus: formatDate(data[14]),
      });
    })
    .on('end', async () => {
      console.log('✅ Linhas filtradas:', results.length);
      
      for (const row of results) {
        try {
          await db.promise().query(
            `INSERT INTO transactions (stonecode, datadavenda, bandeira, produto, stoneid, qtddeparcelas, valorbruto, valorliquido, descontodemdr, descontodeantecipacao, numerocartao, meiodecaptura, numeroserie, ultimostatus, dataultimostatus) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            Object.values(row)
          );
        } catch (err) {
          console.error('❌ Erro ao inserir no banco:', err.sqlMessage || err);
        }
      }

      res.send({ message: 'CSV processado e inserido no banco!' });
    })
    .on('error', (err) => {
      console.error('❌ Erro no processamento do CSV:', err);
      res.status(500).send('Erro ao processar o arquivo.');
    });
});

module.exports = router;
