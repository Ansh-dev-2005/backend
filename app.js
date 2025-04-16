// backend/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use(cors({ origin: '*' }));

const clickhouseRoutes = require('./routes/clickhouse');
const fileRoutes = require('./routes/flatfile');

app.use('/api/clickhouse', clickhouseRoutes);
app.use('/api/files', fileRoutes);

app.listen(5000, () => {
  console.log('Backend server running on port 5000');
});
