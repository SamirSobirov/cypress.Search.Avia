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
        text: `${message}\n🕒 <i>Время проверки: ${time}</i>`, 
        parse_mode: 'HTML' 
      }
    });
  };

  it('Flow: Login -> Search -> Check Status', () => {
    // Расширяем перехват: ловим любой POST запрос к API после клика
    cy.intercept('POST', '**/api/**').as('apiSearch');

    cy.visit('/home', { timeout: 30000 });

    // 1. Логин
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 15000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false, delay: 30 });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false, delay: 30 })
      .type('{enter}');

    cy.url().should('include', '/home');

    // 2. Улучшенный ввод городов (выбираем из выпадающего списка)
    // Откуда
    cy.get('#from').clear().type('Ташкент', { delay: 100 });
    cy.get('.p-autocomplete-panel', { timeout: 10000 }).should('be.visible'); 
    cy.get('.p-autocomplete-item').contains('Ташкент').click(); 

    // Куда
    cy.get('#to').clear().type('Москва', { delay: 100 });
    cy.get('.p-autocomplete-panel', { timeout: 10000 }).should('be.visible');
    cy.get('.p-autocomplete-item').contains('Москва').click(); 
    
    // 3. Выбор даты
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();
    
    cy.get("input[placeholder='Когда']").click();
    if (day < new Date().getDate()) {
       cy.get('.p-datepicker-next').click();
    }
    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`)).click({ force: true });
    
    cy.get('body').type('{esc}');

    // 4. Клик по поиску
    // Проверяем, что кнопка не просто видна, но и готова к клику
    cy.get('#search-btn').should('not.be.disabled').click();

    // Проверяем, был ли вообще запрос. Если не был — упадем с понятной ошибкой.
    cy.wait('@apiSearch', { timeout: 20000 }).then((interception) => {
      const status = interception.response.statusCode;
      sendToTelegram(`<b>✅ Global Travel</b>\nСтатус API: <code>${status}</code>`);
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      // Сообщение об ошибке
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\nЛог: <code>${this.currentTest.err.message}</code>`);
    }
  });
});