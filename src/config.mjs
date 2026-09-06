import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  port: process.env.PORT || 4000,
  keys: {
    openrouter1: process.env.OPENROUTER_API_KEY_1 || '',
    openrouter2: process.env.OPENROUTER_API_KEY_2 || '',
    gemini: process.env.GEMINI_API_KEY || ''
  },
  endpoints: {
    openrouter: 'https://openrouter.ai/api/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models'
  }
};