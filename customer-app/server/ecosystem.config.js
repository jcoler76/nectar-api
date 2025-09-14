module.exports = {
  apps: [
    {
      name: 'nectar-api',
      script: 'server.js',
      cwd: '/home/ubuntu/nectar-api/server',
      env_production: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
    },
  ],
};
