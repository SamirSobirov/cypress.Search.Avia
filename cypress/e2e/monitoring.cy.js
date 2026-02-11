describe('Scheduled Monitoring', () => {
  const token = Cypress.env('TELEGRAM_TOKEN');
  const chatId = Cypress.env('TELEGRAM_CHAT_ID');

 const sendToTelegram = (message) => {
    if (!token || !chatId) return;
    
    // Форматируем время именно для Ташкента
    const time = new Date().toLocaleString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Asia/Tashkent' // Принудительно Узб время
    });

    cy.request({
      method: 'POST',
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      failOnStatusCode: false,
      body: { 
        chat_id: chatId, 
        text: `${message}\n\n🕒 <b>Узбекистан: ${time}</b>`, 
        parse_mode: 'HTML' 
      }
    });
  };
  
  it('Monitoring Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/offers**').as('apiSearch');

    cy.visit('https://test.globaltravel.space/home');

    // 1. Логин
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // 2. ОТКУДА
    cy.get('#from').click({force: true}).clear().type('Ташкент', { delay: 200 });
    cy.wait(1000);
    cy.get('#from').type('{enter}');
    
    cy.wait(1000);

    // 3. КУДА (Исправлено)
    cy.get('#to').click({force: true}).clear().type('Москва', { delay: 250 });
    cy.wait(1500); // Даем сайту "прожевать" Москву
    cy.get('#to').type('{enter}');
    cy.wait(1000);

    // 4. ДАТА
    cy.get("input[placeholder='Когда']").click();
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    const dayToSelect = targetDay.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${dayToSelect}$`)).click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(2000); 

    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const status = interception.response.statusCode;
      const body = interception.response.body;
      let count = 0;
      if (Array.isArray(body)) count = body.length;
      else if (body?.data) count = Array.isArray(body.data) ? body.data.length : (body.data.offers?.length || 0);

      sendToTelegram(`✅ <b>MetaTrip Search</b>\nСтатус API: <b>${status}</b>\nБилетов: <b>${count}</b>`);
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      sendToTelegram(`<b>❌ МОНИТОРИНГ УПАЛ</b>\n<code>${this.currentTest.err.message.substring(0, 150)}</code>`);
    }
  });
});
