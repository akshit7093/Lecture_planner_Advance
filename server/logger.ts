import { log as viteLog } from './vite';

// Enhanced logging utility that builds on top of the existing Vite logger
export const logger = {
  info: (message: string | object, source = 'app', ...args: any[]) => {
    const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    viteLog(`${formattedMessage}`, source);
    if (args.length > 0) {
      console.log('Additional info:', ...args);
    }
  },
  
  error: (message: string | object, source = 'app', ...args: any[]) => {
    const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    console.error(`[ERROR] [${source}] ${formattedMessage}`);
    if (args.length > 0) {
      console.error('Error details:', ...args);
    }
  },
  
  debug: (message: string | object, source = 'app', ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
      console.log(`[DEBUG] [${source}] ${formattedMessage}`);
      if (args.length > 0) {
        console.log('Debug details:', ...args);
      }
    }
  },
  
  api: (model: string, status: number, responseTime: number, responseSize: number) => {
    viteLog(`API Call: ${model} | Status: ${status} | Time: ${responseTime}ms | Size: ${responseSize} bytes`, 'api');
  },
  
  apiError: (model: string, errorStatus: number, error: any) => {
    console.error(`[API ERROR] Model: ${model} | Status: ${errorStatus}`, error);
  }
};