const express = require('express');
const cors = require('cors');
const db = require('./db');
const uploadRoute = require('./routes/upload'); 
const reportsRoute = require('./routes/reports');
require('dotenv').config();

const app = express();



app.use(cors());
app.use(express.json());
app.use('/api', uploadRoute); 
app.use('/api', reportsRoute);


app.get('/', (req, res) => {
    res.send('SimpliSaldo API funcionando!');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
