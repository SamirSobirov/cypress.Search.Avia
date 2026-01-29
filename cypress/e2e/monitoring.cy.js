describe('Scheduled Monitoring & Telegram Reporting', () => {
  const token = Cypress.env('TELEGRAM_TOKEN');
  const chatId = Cypress.env('TELEGRAM_CHAT_ID');

  const sendToTelegram = (message) => {
    if (!token || !chatId) return;
    cy.request({
      method: 'POST',
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      failOnStatusCode: false,
      body: { chat_id: chatId, text: message, parse_mode: 'HTML' }
    });
  };

  it('Flow: Login -> Search -> Check Status', () => {
    // Увеличиваем время ожидания ответа API до 30 секунд
    cy.intercept('POST', '**/api/**').as('apiSearch');

    cy.visit('/home', { timeout: 30000 });

    // Ждем появления инпута, прежде чем печатать
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 15000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    // Ждем перехода на главную после логина
    cy.url().should('include', '/home');

    // Работа с полями "Откуда" и "Куда"
    cy.get('#from').should('be.visible').clear().type('Ташкент');
    cy.wait(1000); // Небольшая пауза для выпадашки
    cy.get('#from').type('{enter}');

    cy.get('#to').should('be.visible').clear().type('Москва');
    cy.wait(1000);
    cy.get('#to').type('{enter}');
    
    // Выбор даты
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    
    cy.get("input[placeholder='Когда']").click();
    // Пытаемся кликнуть по числу
    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click({force: true}); // force поможет, если календарь перекрыт
    
    cy.get('body').type('{esc}');

    // Жмем поиск
    cy.get('#search-btn').should('be.visible').click();

    // Ловим ответ сервера
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const status = interception.response.statusCode;
      sendToTelegram(`<b>✅ Global Travel</b>\nСтатус API: <code>${status}</code>`);
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      // Отправляем конкретную ошибку в телеграм
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\nОшибка: <code>${this.currentTest.err.message}</code>`);
    }
  });
});