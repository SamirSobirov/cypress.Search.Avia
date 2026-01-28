const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // Отключаем автоматический перезапуск при сохранении кода
    watchForFileChanges: false,
    
    // Базовый URL, чтобы в тестах писать просто cy.visit('/home')
    baseUrl: 'https://test.globaltravel.space', 
    
    viewportWidth: 1280,
    viewportHeight: 720,

    setupNodeEvents(on, config) {
      // сюда можно добавлять плагины в будущем
    },
  },
});