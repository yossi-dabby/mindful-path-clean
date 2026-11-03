import { mergeConfig } from 'vite';
import mainConfig from '../../vite.config.js';
export default mergeConfig(mainConfig, {
  server: { proxy: { '/api/hebrew-forms-pilot': 'http://127.0.0.1:3005' } },
});
