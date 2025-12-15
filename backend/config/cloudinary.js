// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: "dx5upwewc",
  api_key: 364439887451989,
  api_secret: "UJZnkmGmkXFsDtAxGOvwYAla0fc",
});

module.exports = { cloudinary };