// backend/routes/upload.js
const router = require('express').Router();
const { cloudinary } = require('../config/cloudinary');
const { auth, permit } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (dá para vídeos curtos)
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|heic|heif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(file.mimetype) || allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens e vídeos são permitidos!'));
    }
  }
});

router.post('/proof', auth, permit('client'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Ficheiro obrigatório' });

    const isVideo = req.file.mimetype.startsWith('video/');

    // Configuração base
    const uploadOptions = {
      folder: 'treinos_prova',
      resource_type: isVideo ? 'video' : 'image',
      quality: 'auto:good',
      fetch_format: 'auto',
      // LIMITA SEMPRE A LARGURA MÁXIMA A 900px (ideal para o teu layout)
      width: 900,
      crop: 'limit', // não aumenta, só reduz se for maior
      // Para vídeos: também aplica redimensionamento
      ...(isVideo && {
        transformation: [
          { width: 900, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      }),
      // Para imagens: transformação mais avançada
      ...(!isVideo && {
        transformation: [
          { width: 900, height: 1200, crop: 'limit' }, // máx 900x1200 (retrato)
          { quality: 'auto:good', fetch_format: 'auto' },
          { effect: 'sharpen' } // deixa nítido mesmo após compressão
        ]
      })
    };

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    });

  } catch (err) {
    console.error('Erro no upload da prova:', err);
    res.status(500).json({ 
      message: 'Erro ao fazer upload. Tenta com uma imagem/vídeo mais pequeno.' 
    });
  }
});

module.exports = router;