import dotenv from 'dotenv';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import logger from './src/utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🌾 Krushi Seva Kendra server running on port ${PORT}`);
  });
});
