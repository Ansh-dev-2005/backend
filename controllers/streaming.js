const fs = require('fs');
const path = require('path');
const { clickhouseClient } = require('../utills/clickHouse');
let client =null;

const streamClickhouseToCSV = async (tableName) => {
  const outputPath = path.join(__dirname, '..', 'output');
  const outputStream = fs.createWriteStream(outputPath);

  const query = `SELECT * FROM ${tableName} FORMAT CSV`;

  const stream = client.query(query, {
    format: 'CSV',
    clickhouse_settings: {
      max_block_size: 10000, // You can tweak this
    },
  });

  // Pipe ClickHouse stream into file
  stream.pipe(outputStream);

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve(outputPath));
    stream.on('error', reject);
  });
};
exports.streamClickhouseToCSV = streamClickhouseToCSV;