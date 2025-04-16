const express = require('express');
const { createClient } = require('@clickhouse/client'); // Correct import
const path = require('path');
const router = express.Router();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { makeJWT } = require('../middleware/verifyToken');

let client = null;


router.post('/connect', async (req, res) => {
  const { host, username, password } = req.body;
  const jwttoken=makeJWT();
  console.log('Received JWT:', jwttoken); // Debug log
  try {
    client = createClient({
      url: host,
      username: username,
      password: password,

    });

    const rows = await client.query({
      query: 'SELECT 1',
      format: 'JSONEachRow',
    })
    console.log('Result: ', await rows.json());
    res.json({ success: true, message: 'Connection successful' });
  } catch (err) {
    console.error('Connection failed:', err);
    res.status(500).json({ success: false, message: 'Connection failed' });
  }
});

router.get('/tables', async (req, res) => {
  try {
    console.log('Fetching tables...');
    if (!client) {
      return res.status(400).json({ error: 'Not connected to ClickHouse' });
    }

    const result = await client.query({
      query: `SHOW TABLES`,
      format: 'JSONEachRow' // Ensures result.json() returns an array
    });

    const data = await result.json();

    // Check if data is an array and contains rows
    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Unexpected response format from ClickHouse' });
    }

    const tables = data.map(row => Object.values(row)[0]); // extract table names
    res.json({ tables });

  } catch (err) {
    console.error('Error fetching tables:', err.message);
    res.status(500).json({ error: err.message });
  }
});
router.post('/export', async (req, res) => {
  const { table, columns, filePath } = req.body;

  try {
    const query = `SELECT ${columnsList.join(', ')} FROM ${table}`;
    const result = await client.query({ query, format: 'CSV' });

    const fs = require('fs');
    const writeStream = fs.createWriteStream(filePath);
    result.stream.pipe(writeStream);

    writeStream.on('finish', () => {
      res.json({ success: true, message: 'Data exported successfully' });
    });
  } catch (err) {
    console.error('Error exporting data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/query', async (req, res) => {
  const { query } = req.body;
  console.log('Received query:', query);

  try {
    if (!client) {
      return res.status(400).json({ error: 'Not connected to ClickHouse' });
    }

    const result = await client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const data = await result.json();
    res.json({ data });
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).json({ error: err.message });
  }
}

);

router.post('/ingest', async (req, res) => {
  try {
    const { table, columns, database } = req.body;
    console.log('Received table:', table);
    console.log('Received columns:', columns);
    console.log('Received database:', database);

    const tableName = Object.keys(columns)[0];
    const columnsList = columns[tableName];

    console.log('Table name:', tableName);
    console.log('Columns:', columnsList);

    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;
    let totalRecords = 0; // Counter for total records

    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${tableName}.csv`);
    const writeStream = fs.createWriteStream(outputPath);

    // Write CSV header once
    writeStream.write(columnsList.join(',') + '\n');

    while (hasMore) {
      const pagedQuery = `SELECT ${columnsList.join(', ')} FROM ${database}.${tableName} LIMIT ${batchSize} OFFSET ${offset}`;
      console.log('Executing query:', pagedQuery);

      const result = await client.query({
        query: pagedQuery,
        format: 'JSONEachRow',
      });

      const rows = await result.json();

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      totalRecords += rows.length; // Increment the total record count

      // Write each row
      rows.forEach(row => {
        const line = columnsList.map(col => {
          const val = row[col];
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`; // CSV-escape quotes
          }
          return val;
        }).join(',');
        writeStream.write(line + '\n');
      });

      offset += batchSize;
    }

    writeStream.end();

    writeStream.on('finish', () => {
      res.json({
        success: true,
        message: 'Data ingested successfully',
        filePath: `${tableName}.csv`,
        recordCount: totalRecords, // Include record count in the response
      });
    });

    writeStream.on('error', (err) => {
      throw err;
    });
  } catch (err) {
    console.error('Error ingesting data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingest-join', async (req, res) => {
  try {
    const { tables, joins, columns, database } = req.body;
    console.log('Received tables:', tables);
    console.log('Received joins:', joins);
    console.log('Received columns:', columns);
    console.log('Received database:', database);

    if (!Array.isArray(tables) || tables.length < 2 || !Array.isArray(joins)) {
      return res.status(400).json({ error: 'At least two tables and join conditions are required' });
    }

    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;
    let totalRecords = 0; // Counter for total records

    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `joined_data.csv`);
    const writeStream = fs.createWriteStream(outputPath);
    const allColumns = Object.entries(columns)
      .flatMap(([table, cols]) => cols.map(col => `${table}.${col}`));

    writeStream.write(allColumns.join(',') + '\n');
    const joinClause = joins.map(join => {
      const [leftTable, leftColumn] = join.left.split('.');
      const [rightTable, rightColumn] = join.right.split('.');
      const condition = `${leftTable}.${leftColumn} ${join.operator} ${rightTable}.${rightColumn}`;
      return `${join.joinType || 'INNER'} JOIN ${database}.${rightTable} ON ${condition}`;
    }).join(' ');

    const fromClause = `${database}.${tables[0]}`;

    while (hasMore) {
      const query = `
SELECT ${allColumns.join(', ')}
        FROM ${fromClause}
        ${joinClause}
        LIMIT ${batchSize}
        OFFSET ${offset}
      `;
      console.log('Executing Join Query:', query);

      const result = await client.query({
        query: query,
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      totalRecords += rows.length; // Increment the total record count

      rows.forEach(row => {
        const line = allColumns.map(col => {
          const val = row[col];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',');
        writeStream.write(line + '\n');
      });

      offset += batchSize;
    }

    writeStream.end();

    writeStream.on('finish', () => {
      res.json({
        success: true,
        message: 'Joined data ingested successfully',
        filePath: `joined_data.csv`,
        recordCount: totalRecords, // Include record count in the response
      });
    });

    writeStream.on('error', (err) => {
      throw err;
    });

  } catch (err) {
    console.error('Join Ingest Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;