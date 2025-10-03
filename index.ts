import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import configs from './config.json';
import fs from 'fs';

const storageFolder: string = configs.storageFolder.replaceAll('$CWD', process.cwd())

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

