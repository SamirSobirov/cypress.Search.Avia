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

    // 1. Перехватываем ЛЮБОЙ запрос к API (и GET, и POST)
    // Убрали 'POST', чтобы ловить всё, что летит в сторону api
    cy.intercept('**/api/**').as('apiSearch');

    // 2. Заходим на сайт
    cy.visit('/home', { timeout: 60000 });
    
    // 3. Логин
    cy.get('input', { timeout: 30000 }).first().should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.get('input').eq(1)
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');

    // 4. Выбор городов (как в рабочем flow.cy.js)
    cy.get('#from').clear().type('Ташкент', { delay: 150 }).type('{enter}');
    cy.wait(500);
    cy.get('#to').clear().type('Москва', { delay: 150 }).type('{enter}');

    // 5. Выбор даты (через 2 дня)
    cy.get("input[placeholder='Когда']").click();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td', { timeout: 10000 })
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');

    // 6. Клик по поиску
    // Добавили проверку, что кнопка не заблокирована
    cy.get('#search-btn')
      .should('be.visible')
      .should('not.be.disabled')
      .click({ force: true });

    // 7. Ожидание ответа
    // Если поиск вызывает запрос, Cypress его поймает
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const status = interception.response.statusCode;
      const body = interception.response.body;
      
      // Проверяем наличие офферов (учитываем возможную разную структуру body)
      const offers = body.offers || body.data || [];
      const count = Array.isArray(offers) ? offers.length : 0;

      if (status >= 200 && status < 300) {
        const msg = count > 0 
          ? `✅ <b>Global Travel</b>\nНайдено офферов: ${count}`
          : `⚠️ <b>Global Travel</b>\nСтатус: ${status}, но билетов нет.`;
        sendToTelegram(msg);
      } else {
        sendToTelegram(`<b>⚠️ Ошибка сервера</b>\nСтатус: <code>${status}</code>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      // Если упало на cy.wait('@apiSearch'), значит запрос не ушел
      const err = this.currentTest.err.message;
      const cleanErr = err.includes('apiSearch') 
        ? "Ошибка: Кнопка поиска нажата, но сайт не отправил данные (Timeout API)"
        : err;
        
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\n<code>${cleanErr}</code>`);
    }
  });
});
