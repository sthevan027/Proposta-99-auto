/**
 * Sistema de logging
 * Single Responsibility: Apenas logs
 */

import { CONFIG } from './config.js';
import { state } from './state.js';

class Logger {
  log(msg, tipo = 'info') {
    const entry = { 
      time: new Date().toLocaleTimeString(), 
      msg, 
      tipo 
    };
    
    state.logs.push(entry);
    
    if (state.logs.length > CONFIG.LIMITS.MAX_LOGS) {
      state.logs.shift();
    }
    
    console.log(`[99F][${tipo}] ${msg}`);
  }
  
  info(msg) {
    this.log(msg, 'info');
  }
  
  success(msg) {
    this.log(msg, 'success');
  }
  
  warning(msg) {
    this.log(msg, 'warning');
  }
  
  error(msg) {
    this.log(msg, 'error');
  }
}

export const logger = new Logger();
