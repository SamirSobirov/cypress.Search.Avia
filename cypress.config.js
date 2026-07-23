const { defineConfig } = require("cypress");

module.exports = defineConfig({
  chromeWebSecurity: false,

  allowCypressEnv: false, 

  e2e: {
    baseUrl: 'https://b2b.metatrip.asia/sign-in',
    watchForFileChanges: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      return config;
    },
  },
});