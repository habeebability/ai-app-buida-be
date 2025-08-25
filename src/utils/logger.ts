import winston from 'winston';

// Get log level from environment or use defaults
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Create logger configuration
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-app-builder' },
  transports: []
});

// Configure transports based on environment
if (process.env.NODE_ENV === 'production') {
  // Production: Log to files only
  const logDir = process.env.LOG_FILE ? process.env.LOG_FILE.replace('/app.log', '') : './logs';
  
  logger.add(new winston.transports.File({ 
    filename: `${logDir}/error.log`, 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({ 
    filename: `${logDir}/combined.log`,
    maxsize: 5242880, // 5MB  
    maxFiles: 5
  }));
} else {
  // Development: Log to console with colors
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
  
  // Also log to files in development if LOG_FILE is specified
  if (process.env.LOG_FILE) {
    const logDir = process.env.LOG_FILE.replace('/app.log', '');
    logger.add(new winston.transports.File({ 
      filename: `${logDir}/combined.log`,
      level: 'debug'
    }));
  }
}

export default logger; 