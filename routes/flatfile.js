const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@clickhouse/client');

const router = express.Router();

const { upload } = require('../utills/uploads'); // Ensure upload is imported from utils/uploads

router.post('/import', upload.single('file'), async (req, res) => {
  // console.log('Request received at /import endpoint'); // Debug log
  // console.log('Request headers:', req.headers); // Debug log
  // console.log('Request body:', req.body); // Debug log
  console.log('Request file:', req.file); // Debug log

  if (!req.file) {
    console.error('No file received in the request.'); // Debug log
    console.log('Ensure the client is sending the file with the correct field name: "file".'); // Debug log
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  console.log('File saved at path:', filePath); // Debug log

  if (!fs.existsSync(filePath)) {
    console.error('File not found at the expected path:', filePath); // Debug log
    return res.status(500).send('File not saved correctly.');
  }

  const { config, database, table, mode, newTableName } = req.body;
  const file = req.file;

  if (!file || !config || !database) {
    console.error('Missing data in request:', { file, config, database }); // Debug log
    return res.status(400).send('Missing data.');
  }

  console.log('Uploaded file details:', file); // Debug log

  console.log('Uploaded file:', file);
  let configObj;
  try {
    configObj = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (err) {
    return res.status(400).send({ error: 'Invalid config JSON format' });
  }
  console.log('Database:', config.username); // Debug log

  const client = createClient({
    url: configObj.host,
    username: configObj.username,
    password: configObj.password,
  });

  console.log('ClickHouse client created with config:', config); // Debug log

  const permanentFilePath = file.path; // Ensure file path is correctly referenced
  console.log('Renaming file to permanent path:', permanentFilePath); // Debug log
  if (!fs.existsSync(permanentFilePath)) {
    console.error('Uploaded file not found at path:', permanentFilePath); // Debug log
    return res.status(500).send({ error: 'Uploaded file not found after rename.' });
  }

  try {
    console.log('Reading file from path:', permanentFilePath); // Debug log
    const raw = fs.readFileSync(permanentFilePath, 'utf-8');

    if (!raw || raw.trim() === '') {
      throw new Error('Uploaded file is empty or invalid.');
    }

    const [header, ...rows] = raw.trim().split('\n');

    if (!header) {
      throw new Error('File does not contain a valid header row.');
    }

    const columns = header.split(',');

    console.log('File header:', header); // Debug log
    console.log('Inferred columns:', columns); // Debug log

    if (mode === 'create') {
      const inferredTypes = 'String';
      const tableSchema = columns.map(col => `\`${col}\` ${inferredTypes}`).join(', ');
      const createQuery = `CREATE TABLE IF NOT EXISTS \`${database}\`.\`${newTableName}\` (${tableSchema}) ENGINE = MergeTree() ORDER BY tuple()`;

      console.log('Executing create table query:', createQuery); // Debug log
      await client.query({ query: createQuery });
    }

    const targetTable = mode === 'create' ? newTableName : table;
    const insertQuery = `INSERT INTO ${database}\.${targetTable}`;

    console.log('Executing insert query:', insertQuery); // Debug log

    const fileStream = fs.createReadStream(permanentFilePath);
    console.log('Insert Query:', insertQuery);
    console.log('File Stream:', !!fileStream); // true if stream is valid
    // await client.insert({
    //   table: 'my_table',
    //   values: [{
    //     id: 1,
    //     dec32:  '1234567.89',
    //     dec64:  '123456789123456.789',
    //     dec128: '1234567891234567891234567891.1234567891',
    //     dec256: '12345678912345678912345678911234567891234567891234567891.12345678911234567891',
    //   }],
    //   format: 'JSONEachRow',
    // })
    await client.insert({
      table: targetTable,
      values: fileStream,
      format: 'CSV',
      // format: 'JSONEachRow',
     
    });

    console.log('Data successfully inserted into table:', targetTable); // Debug log
    res.send({ success: true });

  } catch (err) {
    console.error('Error during file processing or database operation:', err); // Debug log
    // if (fs.existsSync(permanentFilePath)) fs.unlinkSync(permanentFilePath);
    res.status(500).send({ error: err.message });
  }
});
router.post('/test-upload', upload.single('file'), (req, res) => {
  console.log('File uploaded:', req.file);
  res.json({ message: 'Uploaded', file: req.file });
});
module.exports = router;
