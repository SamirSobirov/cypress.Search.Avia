describe('Scheduled Monitoring & Telegram Reporting', () => {
  const token = Cypress.env('TELEGRAM_TOKEN');
  const chatId = Cypress.env('TELEGRAM_CHAT_ID');

  const sendToTelegram = (message) => {
    if (!token || !chatId) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    cy.request({
      method: 'POST',
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      failOnStatusCode: false,
      body: { 
        chat_id: chatId, 
        text: `${message}\n🕒 <i>Время (UTC): ${time}</i>`, 
        parse_mode: 'HTML' 
      }
    });
  };

  it('Flow: Login -> Search -> Check Status', () => {
    // Устанавливаем размер окна как в обычном браузере
    cy.viewport(1280, 800);

    // 1. Заходим на сайт
    cy.visit('/home', { timeout: 60000 });
    
    // Перехватываем API запрос, чтобы проверить результат поиска
    cy.intercept('POST', '**/api/**').as('apiSearch');

    // 2. Логин (как в твоем flow.cy.js)
    cy.get('input').first().should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.get('input').eq(1)
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');

    // 3. Выбор городов через {enter} (самый стабильный метод)
    cy.get('#from')
      .should('be.visible')
      .clear()
      .type('Ташкент', { delay: 150 })
      .type('{enter}');
    
    cy.wait(500); // Небольшая пауза между полями

    cy.get('#to')
      .should('be.visible')
      .clear()
      .type('Москва', { delay: 150 })
      .type('{enter}');

    // 4. Выбор даты (через 2 дня)
    cy.get("input[placeholder='Когда']").click();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td', { timeout: 10000 })
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');

    // 5. Клик по поиску
    cy.get('#search-btn')
      .should('be.visible')
      .click({ force: true });

    // 6. Ожидание и анализ ответа API
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const status = interception.response.statusCode;
      const responseBody = interception.response.body;

      if (status >= 200 && status < 300) {
        const hasOffers = responseBody.offers && responseBody.offers.length > 0;
        const count = hasOffers ? responseBody.offers.length : 0;
        
        const msg = hasOffers 
          ? `✅ <b>Global Travel</b>\nСтатус: ${status}\nНайдены билеты: ${count}`
          : `⚠️ <b>Global Travel</b>\nСтатус: ${status}\nБилетов на эту дату нет.`;
        
        sendToTelegram(msg);
      } else {
        sendToTelegram(`<b>⚠️ Ошибка API</b>\nКод: <code>${status}</code>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      const errorMessage = this.currentTest.err.message;
      sendToTelegram(
        `<b>❌ ТЕСТ УПАЛ</b>\nОшибка: <code>${errorMessage}</code>`
      );
    }
  });
});
