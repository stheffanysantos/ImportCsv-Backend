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

// Atualização para retornar apenas a data, sem a hora
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

  // Retorna apenas a data, no formato YYYY-MM-DD
  return parsedDate;
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

      if (lineCount === 1 || lineCount === 2) return;

      if (lineCount > 3) {
        columnMapping = {
          [data[0]]: 'stonecode',
          [data[1]]: 'datadavenda',
          [data[2]]: 'bandeira',
          [data[3]]: 'produto',
          [data[4]]: 'stoneid',
          [data[5]]: 'qtddeparcelas',
          [data[6]]: 'valorbruto',
          [data[7]]: 'valorliquido',
          [data[8]]: 'descontodemdr',
          [data[9]]: 'descontodeantecipacao',
          [data[10]]: 'numerocartao',
          [data[11]]: 'meiodecaptura',
          [data[12]]: 'numeroserie',
          [data[13]]: 'ultimostatus',
          [data[14]]: 'dataultimostatus',
        };
        console.log('📌 Cabeçalhos detectados:', columnMapping);
        return;
      }

      
      
      //console.log(new Date(data[columnMapping['DATADAVENDA']]));
      //console.log(formatDate(data[columnMapping['DATADAVENDA']]));
      results.push({
        stonecode: data[columnMapping['STONECODE']] || null,
        datadavenda: formatDate(data[columnMapping['DATADAVENDA']]),
        datadavenda: new Date(data[columnMapping['DATADAVENDA']]),
        bandeira: data[columnMapping['BANDEIRA']] || null,
        produto: data[columnMapping['PRODUTO']] || null,
        stoneid: data[columnMapping['STONEID']] || null,
        qtddeparcelas: parseInt(data[columnMapping['QTDDEPARCELAS']]) || null,
        valorbruto: formatCurrency(data[columnMapping['VALORBRUTO']]),
        valorliquido: formatCurrency(data[columnMapping['VALORLIQUIDO']]),
        descontodemdr: formatCurrency(data[columnMapping['DESCONTODEMDR']]),
        descontodeantecipacao: formatCurrency(data[columnMapping['DESCONTODEANTECIPACAO']]),
        numerocartao: data[columnMapping['NUMEROCARTAO']] || null,
        meiodecaptura: data[columnMapping['MEIODECAPTURA']] || null,
        numeroserie: data[columnMapping['NUMEROSERIE']] || null,
        ultimostatus: data[columnMapping['ULTIMOSTATUS']] || null,
        dataultimostatus: new Date(data[columnMapping['DATAULTIMOSTATUS']]),
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
