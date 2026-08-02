module.exports = {
  apps: [
    {
      name: "jenniupload-api",
      cwd: "./backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
    {
      name: "jenniupload-worker",
      cwd: "./backend",
      script: "cronjobs/processuploads.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};