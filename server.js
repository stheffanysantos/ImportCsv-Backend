const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const uploadRoute = require('./routes/upload'); 

const app = express();


app.use(cors());

app.use(bodyParser.json());


app.use('/api', uploadRoute); 


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
