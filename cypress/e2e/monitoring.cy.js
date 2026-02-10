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
    cy.viewport(1280, 800);

    // ИЗМЕНЕНИЕ: ловим любой поддомен api (api, api2, и т.д.)
    cy.intercept('**/v1/content/offers/**').as('apiSearch');

    cy.visit('/home', { timeout: 60000 });
    
    // 3. Логин
    cy.get('input', { timeout: 30000 }).first().should('be.visible')
      .clear().type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.get('input').eq(1)
      .clear().type(Cypress.env('LOGIN_PASSWORD'), { log: false });

    cy.get('button').contains(/Войти|Sign In/i).click();

    cy.url({ timeout: 40000 }).should('include', '/home');

    // 4. Выбор городов
    cy.get('#from').should('be.visible').click().clear()
      .type('Ташкент', { delay: 200 }).type('{enter}').blur();
    cy.wait(1500);

    cy.get('#to').should('be.visible').click().clear()
      .type('Москва', { delay: 200 }).type('{enter}').blur();
    cy.wait(1500);

    // 5. Выбор даты
    cy.get("input[placeholder='Когда']").click();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();
    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`)).click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(2000); 

    // 6. Клик по поиску
    cy.get('#search-btn').should('not.be.disabled').click({ force: true });

    // 7. Ожидание ответа
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const status = interception.response.statusCode;
      const body = interception.response.body;
      
      // На твоем скриншоте видно, что данных много. Проверим длину массива.
      const offersCount = body.length || (body.data ? body.data.length : 0);

      if (status === 200) {
        sendToTelegram(`✅ <b>Global Travel</b>\nБилеты найдены! Количество: <b>${offersCount}</b>`);
      } else {
        sendToTelegram(`⚠️ <b>Global Travel</b>\nСтатус API: ${status}. Возможно, поиск не удался.`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      const err = this.currentTest.err.message;
      let msg = `<b>❌ ТЕСТ УПАЛ</b>\n`;
      
      if (err.includes('apiSearch')) {
        msg += `<code>Сайт не прислал билеты вовремя (Timeout)</code>`;
      } else if (err.includes('/home')) {
        msg += `<code>Не удалось залогиниться. Проверь пароль.</code>`;
      } else {
        msg += `<code>${err}</code>`;
      }
      sendToTelegram(msg);
    }
  });
});
