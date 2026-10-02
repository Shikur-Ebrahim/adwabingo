module.exports = {
  apps: [
    {
      name: 'adwabingo-bot',
      cwd: './bot',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'adwabingo-api',
      cwd: './api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production', PORT: 3002 },
    },
  ],
};
