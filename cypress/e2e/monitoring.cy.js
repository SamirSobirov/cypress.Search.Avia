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
    // 1. Заходим на сайт
    cy.visit('/home', { timeout: 60000 });
    cy.intercept('POST', '**/api/**').as('apiSearch');

    // 2. Логин (с проверкой на наличие полей)
    cy.get('input', { timeout: 30000 }).should('be.visible');
    
    cy.get('input').first().type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.get('input').eq(1).type(Cypress.env('LOGIN_PASSWORD'), { log: false, delay: 50 });
    cy.get('input').eq(1).type('{enter}');

    // Ждем перехода на главную
    cy.url({ timeout: 30000 }).should('include', '/home');

    // 3. СВЕРХСТАБИЛЬНЫЙ выбор городов
    const selectCity = (selector, city) => {
      cy.log(`Выбираю город: ${city}`);
      
      // Кликаем и печатаем с паузами
      cy.get(selector).should('be.visible').click().clear().type(city, { delay: 200 });
      
      // Если список не появился, кликаем еще раз (важно для headless режима)
      cy.wait(1000); 
      cy.get('body').then(($body) => {
        if ($body.find('[class*="p-autocomplete-item"]').length === 0) {
          cy.get(selector).click().type(' '); // Добавляем пробел, чтобы спровоцировать поиск
        }
      });

      // Кликаем по элементу списка
      cy.get('[class*="p-autocomplete-item"]', { timeout: 20000 })
        .contains(new RegExp(`^${city}`, 'i'))
        .should('be.visible')
        .click({ force: true });
      
      cy.wait(1000);
    };

    selectCity('#from', 'Ташкент');
    selectCity('#to', 'Москва');

    // 4. Выбор даты
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get("input[placeholder='Когда']").click();
    cy.get('.p-datepicker-calendar td', { timeout: 15000 })
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    // 5. Поиск
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. Анализ ответа API
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const status = interception.response.statusCode;
      const body = interception.response.body;

      if (status >= 200 && status < 300) {
        const offersCount = body.offers ? body.offers.length : 0;
        const msg = offersCount > 0 
          ? `✅ <b>Global Travel</b>\nБилеты найдены! Количество: ${offersCount}`
          : `⚠️ <b>Global Travel</b>\nСтатус: ${status}, но билетов на эту дату нет.`;
        sendToTelegram(msg);
      } else {
        sendToTelegram(`<b>⚠️ Ошибка API: ${status}</b>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\nОшибка: <code>${this.currentTest.err.message}</code>`);
    }
  });
});
