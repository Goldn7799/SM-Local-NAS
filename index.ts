import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import configs from './config.json';
import fs from 'fs';
import mime from 'mime-types';

const storageFolder: string = configs.storageFolder.replaceAll('$CWD', process.cwd())
if (!fs.existsSync(storageFolder)) fs.mkdirSync(storageFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix: string = `${Date.now()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
})

const upload = multer({
  storage,
  limits: { fileSize: configs.uploadLimitGB * 1024 * 1024 * 1024 }
})

const app = express()
app.use(cors({
  origin: configs.origin
}))
app.use(bodyParser.json({
  limit: configs.limitJSON
}))

app.get('/', (req, res) => {
  res.status(200)
  .sendFile(path.join(process.cwd(), 'interface.html'));
})

app.get('/dirpath', (req, res) => {
  const rawDir: string[] = fs.readdirSync(storageFolder);
  const fileList = rawDir.map((filename) => {
    const filePath = path.join(storageFolder, filename);
    let size = 0;
    try {
      const stat = fs.statSync(filePath);
      size = stat.size;
    } catch {
      size = 0;
    }
    return { filename, size };
  });
  res.status(200)
    .json(fileList);
})

app.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const originalFileName: string = filename.replaceAll('%20', ' ');
  const rawDir: string[] = fs.readdirSync(storageFolder);
  if (!rawDir.includes(originalFileName)) return res.status(404);

  const filePath = path.join(storageFolder, originalFileName);
  // Use built-in Node.js or a simple map for common types
  const mimeType = mime.lookup(originalFileName) || 'application/octet-stream';

  // Inline if text/*, video/*, audio/*, image/*, or common browser-supported application types
  const isInline = (
    mimeType.startsWith('text/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('image/') ||
    [
      'application/pdf',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/typescript',
      'text/html',
      'image/svg+xml'
    ].includes(mimeType)
  );

  res.status(200);
  res.setHeader('Content-Type', mimeType);
  if (isInline) {
    res.setHeader('Content-Disposition', `inline; filename="${originalFileName}"`);
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
  }
  res.sendFile(filePath);
})

app.post('/', upload.single('uploaded_file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file choosen or File Limit reached.' });
  console.log(`File Successfully Saved: `, req.file);
  res.status(200)
  .json({
    message: 'File successfully Uploaded.',
    originalName: req.file.originalname,
    savedFileName: req.file.filename,
    path: req.file.path
  })
})

app.listen(configs.port, () => {
  console.log(`Listening at port ${configs.port}`);
  console.log(`Using directory ${storageFolder} for public folder.`)
})
