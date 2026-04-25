require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mapRoute = require('./api/map');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.post('/api/map', async (req, res) => {
  try {
    await mapRoute(req, res);
  } catch (error) {
    console.error('Error executing map route:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

const path = require('path');

app.get('/api/map', (req, res) => {
  res.status(200).send('API is running');
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
