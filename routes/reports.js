const express = require('express');
const router = express.Router();
const db = require('../db'); 


router.get('/reports', (req, res) => {
    const query = 'SELECT * FROM transactions';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Erro ao buscar os dados.');
        }
        res.send(results); 
    });
});

module.exports = router;
