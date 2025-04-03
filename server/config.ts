// Configuration settings for the application
// These will be loaded from environment variables

// API Configuration
export const API_CONFIG = {
  // OpenRouter API key
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  
  // Model to use for AI-powered content generation
  MODEL_NAME: process.env.MODEL_NAME || 'google/gemini-2.5-pro-exp-03-25:free',
  
  // Base URL for OpenRouter API
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1/chat/completions'
};

// Server Configuration
export const SERVER_CONFIG = {
  // Default port to use
  PORT: parseInt(process.env.PORT || '5000'),
  
  // Whether to use localhost (true) or 0.0.0.0 (false) for binding
  USE_LOCALHOST: process.env.USE_LOCALHOST === 'true' || true,
  
  // Fallback port if primary port is unavailable
  FALLBACK_PORT: parseInt(process.env.FALLBACK_PORT || '3000')
};

// Function to validate required configuration
export function validateConfig() {
  const missingVars = [];
  
  if (!API_CONFIG.OPENROUTER_API_KEY) {
    missingVars.push('OPENROUTER_API_KEY');
  }
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some functionality may not work correctly.');
    return false;
  }
  
  return true;
}

// Export default config object
export default {
  api: API_CONFIG,
  server: SERVER_CONFIG
};