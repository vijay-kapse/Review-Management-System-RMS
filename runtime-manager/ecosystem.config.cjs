module.exports = {
  apps: [
    {
      name: 'vijay-portal',
      script: '/home/vkapse/runtime-manager/bin/start-portal.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/vijay-portal',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    },
    {
      name: 'argus-backend',
      script: '/home/vkapse/runtime-manager/bin/start-argus-backend.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/unified-apps/argus/searchLite',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    },
    {
      name: 'argus-frontend',
      script: '/home/vkapse/runtime-manager/bin/start-argus-frontend.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/unified-apps/argus/Argus_Frontend-master',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    },
    {
      name: 'survey-app',
      script: '/home/vkapse/runtime-manager/bin/start-survey.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/unified-apps/survey/survey_group8',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    },
    {
      name: 'chatbot-app',
      script: '/home/vkapse/runtime-manager/bin/start-chatbot.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/unified-apps/chatbot',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    },
    {
      name: 'sysreview-app',
      script: '/home/vkapse/runtime-manager/bin/start-sysreview.sh',
      interpreter: '/bin/bash',
      cwd: '/home/vkapse/unified-apps/sysreview/src',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10
    }
  ]
};
