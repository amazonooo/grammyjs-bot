require('dotenv').config()
const {
	Bot,
	GrammyError,
	HttpError,
	Keyboard,
	InlineKeyboard,
  session,
  MemorySessionStorage,
} = require('grammy')
const { hydrate } = require('@grammyjs/hydrate')

const bot = new Bot(process.env.BOT_API_KEY)
bot.use(hydrate())

bot.use(session({ initial: () => ({}), storage: new MemorySessionStorage() }))

bot.api.setMyCommands([
  {
    command: 'start', description: 'Запуск бота'
  }
])

bot.command('start', async (ctx) => {
  ctx.session = {}
  const inlineKeyboard = new InlineKeyboard().text('Мужской', 'male').text('Женский', 'female')
  await ctx.reply('Привет! Давай заполним анкету. Выбери свой пол:', {
    reply_markup: inlineKeyboard
  })
})

bot.callbackQuery(['male', 'female'], async (ctx) => {
  ctx.session.gender = ctx.callbackQuery.data
  const inlineKeyboard = new InlineKeyboard().text('Разработка', 'dev').text('Маркетинг', 'marketing').text('Продажи', 'sales')
  await ctx.reply('Род деятельности:', {
    reply_markup: inlineKeyboard
  })
  await ctx.answerCallbackQuery()
})

bot.callbackQuery(['dev', 'marketing', 'sales'], async (ctx) => {
  ctx.session.occupation = ctx.callbackQuery.data
  const inlineKeyboard = new InlineKeyboard().text('14-18', '14-18').text('19-21', '19-21').text('22-25', '22-25').text('25+', '25+')
  await ctx.reply('Выбери свой возраст:', {
    reply_markup: inlineKeyboard
  })
  await ctx.answerCallbackQuery()
})

bot.callbackQuery(['14-18', '19-21', '22-25', '25+'], async (ctx) => {
  ctx.session.age = ctx.callbackQuery.data
  const inlineKeyboard = new InlineKeyboard().text('Меньше 1 года', '<1').text('1 год', '1-year').text('2-4 года', '2-4').text('5+', '5+')
  await ctx.reply('Твой опыт:', {
    reply_markup: inlineKeyboard
  })
  await ctx.answerCallbackQuery()
})

bot.callbackQuery(['<1', '1-year', '2-4', '5+'], async (ctx) => {
  ctx.session.experience = ctx.callbackQuery.data
  const inlineKeyboard = new InlineKeyboard()
		.text('0-30.000₽', '30k')
		.row()
		.text('30.000₽-60.000₽', '30-60k')
		.row()
		.text('120.000₽-180.000₽', '120-180k')
		.row()
		.text('180.000₽', '180k')
  await ctx.reply('Твой доход:', {
    reply_markup: inlineKeyboard
  })
  await ctx.answerCallbackQuery()
})

bot.callbackQuery(['30k', '30-60k', '120-180k', '180k'], async (ctx) => {
  ctx.session.current_income = ctx.callbackQuery.data
  const inlineKeyboard = new InlineKeyboard()
		.text('50.000₽+', '50k')
		.row()
		.text('100.000₽+', '100k')
		.row()
		.text('200.000₽+', '200k')
		.row()
		.text('300.000₽+', '300k')
  await ctx.reply('На какой доход хочешь выйти?:', {
    reply_markup: inlineKeyboard
  })
  await ctx.answerCallbackQuery()
})

bot.callbackQuery(["50k", "100k", "200k", "300k"], async (ctx) => {
	ctx.session.desired_income = ctx.callbackQuery.data;

	await ctx.reply(
		`📋 *Твоя анкета заполнена:*\n
👤 Пол: ${ctx.session.gender === "male" ? "Мужской" : "Женский"}
💼 Род деятельности: ${ctx.session.occupation}
🎂 Возраст: ${ctx.session.age}
📅 Опыт: ${ctx.session.experience}
💰 Текущий доход: ${ctx.session.current_income}
💸 Желаемый доход: ${ctx.session.desired_income}`,
		{ parse_mode: "Markdown" }
	);

	await ctx.reply("✅ Спасибо! Теперь ты можешь получить обучение или оставить отзыв.", {
		reply_markup: new InlineKeyboard().text("📚 Получить урок", "lesson"),
	});

	await ctx.answerCallbackQuery();
});

bot.start()