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
    cy.intercept('POST', '**/api/**').as('apiSearch');

    cy.visit('/home', { timeout: 30000 });

    // 1. Логин (добавил delay, чтобы инпуты успевали прожевать текст)
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 15000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false, delay: 50 });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false, delay: 50 })
      .type('{enter}');

    cy.url().should('include', '/home');

    // 2. Исправленный ввод "Откуда" и "Куда"
    // Используем delay и принудительный клик по результату, если он есть
    cy.get('#from').should('be.visible').clear().type('Ташкент', { delay: 100 });
    cy.wait(1000); 
    cy.get('#from').type('{enter}');

    cy.get('#to').should('be.visible').clear().type('Москва', { delay: 100 });
    cy.wait(1000);
    cy.get('#to').type('{enter}');
    
    // 3. Умный выбор даты (через 2 дня)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();
    
    cy.get("input[placeholder='Когда']").click();

    // Если число маленькое (например, 1 или 2), а сегодня конец месяца, 
    // возможно нужно нажать кнопку "Следующий месяц"
    if (day < new Date().getDate()) {
       cy.get('.p-datepicker-next').click();
    }

    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');

    // 4. Клик по поиску и проверка API
    cy.get('#search-btn').should('be.visible').and('not.be.disabled').click();

    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const status = interception.response.statusCode;
      if (status >= 200 && status < 300) {
        sendToTelegram(`<b>✅ Global Travel</b>\nСтатус API: <code>${status}</code>\nПоиск отработал штатно.`);
      } else {
        sendToTelegram(`<b>⚠️ Global Travel</b>\nВнимание! API ответил кодом: <code>${status}</code>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\nОшибка: <code>${this.currentTest.err.message}</code>`);
    }
  });
});