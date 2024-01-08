const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const pool = require('./database');
require('dotenv').config()

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'https://online-coding-client-production.up.railway.app',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());
app.use(cors());

const clientsByTitle = {};

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  // Creating groups of sockets according to the code being edited
  const groupTitle = socket.handshake.query.title;
  socket.join(groupTitle);

  // List of socket, in order to tell who is teacher 
  clientsByTitle[groupTitle] = clientsByTitle[groupTitle] || [];
  const isFirstClient = clientsByTitle[groupTitle].length === 0;
  clientsByTitle[groupTitle].push(socket);
  console.log(`${groupTitle} length is: ${clientsByTitle[groupTitle].length}`);
  if (!isFirstClient) {
    socket.emit('readOnlyStatus', { readOnly: false });
  }
  // Handle code updates here
  socket.on('updateCode', async ({ title, updatedCode }) => {
    try {
      // Update the code in database
      await pool.query('UPDATE code SET code = $1 WHERE title = $2', [
        updatedCode,
        title,
      ]);

      // Emit  update to all clients of the same title
      //socket.to(title).emit('codeUpdated', { title, updatedCode });
      socket.broadcast.emit('codeUpdated', { title, updatedCode });
    } catch (error) {
      console.error('Error updating code:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clientsByTitle[groupTitle] = clientsByTitle[groupTitle].filter(client => client !== socket);
  });
});

// Endpoint for fetching a specific record by title
app.get('/record/:title', async (req, res) => {
  console.log("Got GET request for specific title");
  const { title } = req.params;

  try {
    const result = await pool.query('SELECT * FROM code WHERE title = $1', [
      title,
    ]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Existing endpoint for fetching all records
app.get('/records', async (req, res) => {
  try {
    console.log("Got request for all titles from table!");
    const result = await pool.query('SELECT * FROM code');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const port  = process.env.PORT || 4000;
server.listen(port , () => console.log(`Server is running on ${port}`));
