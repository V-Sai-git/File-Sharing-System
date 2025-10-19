const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');

const app = express();
let port = process.env.PORT || 5000;

mongoose.connect('mongodb://localhost/fileshare', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const fileSchema = new mongoose.Schema({
  filename: String,
  url: String,
  token: String,
});

const File = mongoose.model('File', fileSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const token = generateUniqueToken();

    const newFile = new File({
      filename: req.file.originalname,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.originalname}`,
      token: token,
    });

    console.log('File URL:', newFile.url);

    await newFile.save();

    const downloadLink = `${newFile.url}?token=${token}`;
    res.send(`File uploaded successfully! Download link: ${downloadLink}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.use('/uploads', express.static('uploads'));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

app.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${port} is already in use. Trying another port...`);
    port++;
    app.listen(port);
  } else {
    console.error('Error starting server:', err);
  }
});

function generateUniqueToken() {
  return crypto.randomBytes(16).toString('hex');
}
