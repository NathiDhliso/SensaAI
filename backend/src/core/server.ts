import 'dotenv/config';
import { logger } from '../shared/utils/logger.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3000;
// Start server
app.listen(PORT, () => {
    logger.info(` SensaAI Backend running on port ${PORT}`);
    logger.info(` Health check: http://localhost:${PORT}/health`);
    // Server ready
});
export default app; // trigger reload
