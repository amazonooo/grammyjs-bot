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

const { google } = require('googleapis')
const { JWT } = require('google-auth-library')

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, // e-mail сервисного аккаунта
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // приватный ключ из JSON
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1pTBFi7KMRoVJ-1esqWGw66qMuTBUgSd4ZvotsA7mMB4'
const range = 'Лист1!A:F'

const bot = new Bot(process.env.BOT_API_KEY)
bot.use(hydrate())

bot.use(session({ initial: () => ({}), storage: new MemorySessionStorage() }))

const adminId = 737315024

bot.api.setMyCommands([
	{
		command: 'start',
		description: 'Запуск бота',
	},
	{
		command: 'admin_panel',
		description: 'Панель администратора',
	},
])

bot.command('start', async (ctx) => {
  ctx.session = {}
  const inlineKeyboard = new InlineKeyboard().text('Мужской', 'male').text('Женский', 'female')
  await ctx.reply('Привет! Давай заполним анкету. Выбери свой пол:', {
    reply_markup: inlineKeyboard
  })
})

bot.command('admin_panel', async ctx => {
	if (ctx.from.id !== adminId) {
		return ctx.reply('⛔ У вас нет прав для доступа к панели администратора.')
	}

	return sendAdminPanel(ctx)
})

async function sendAdminPanel(ctx) {
	const keyboard = new InlineKeyboard()
		.text('📄 Посмотреть анкеты', 'view_surveys')
		.row()
		.text('📥 Экспорт данных', 'export_data')
		.row()
		.text('📊 Статистика', 'view_stats')

	await ctx.reply('👨‍💻 Панель администратора:', {
		reply_markup: keyboard,
	})
}

bot.callbackQuery('back_to_admin', async ctx => {
	await ctx.editMessageText('👨‍💻 Панель администратора:', {
		reply_markup: new InlineKeyboard()
			.text('📄 Посмотреть анкеты', 'view_surveys')
			.row()
			.text('📊 Статистика', 'view_stats'),
	})
})

bot.callbackQuery("view_surveys", async (ctx) => {
  if (ctx.from.id !==  adminId) {
    return ctx.answerCallbackQuery("⛔ У вас нет прав для этого.");
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return ctx.editMessageText("📭 Анкет пока нет.", {
        reply_markup: new InlineKeyboard().text("🔙 Назад", "back_to_admin"),
      });
    }

    let message = "📋 Анкеты пользователей:\n";
    rows.forEach((row, index) => {
      message += `\n🆔 #${index + 1}\n👤 Пол: ${row[0]}\n💼 Деятельность: ${row[1]}\n🎂 Возраст: ${row[2]}\n📅 Опыт: ${row[3]}\n💰 Доход: ${row[4]}\n💸 Желаемый доход: ${row[5]}\n`;
    });

    await ctx.editMessageText(message, {
			reply_markup: new InlineKeyboard().text('🔙 Назад', 'back_to_admin'),
		})
  } catch (err) {
    console.error("Ошибка при получении данных:", err);
    await ctx.editMessageText('❌ Ошибка при получении анкет.', {
			reply_markup: new InlineKeyboard().text('🔙 Назад', 'back_to_admin'),
		})
  }
});

// const fs = require("fs");
// const { parse } = require("json2csv");

// bot.callbackQuery("export_data", async (ctx) => {
//   if (ctx.from.id !== adminId) {
//     return ctx.answerCallbackQuery("⛔ У вас нет прав для этого.");
//   }

//   try {
//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range,
//     });

//     const rows = response.data.values;
//     if (!rows || rows.length === 0) {
//       return ctx.reply("📭 Нет данных для экспорта.", {
//         reply_markup: new InlineKeyboard().text("🔙 Назад", "back_to_admin"),
//       });
//     }

//     const csv = parse(rows, { header: false });
//     fs.writeFileSync("users.csv", csv);

//     await ctx.replyWithDocument({
//       source: "users.csv",
//       filename: "users.csv",
//     });

//     fs.unlinkSync("users.csv");

//     await ctx.reply("✅ Данные успешно экспортированы.", {
//       reply_markup: new InlineKeyboard().text("🔙 Назад", "back_to_admin"),
//     });
//   } catch (err) {
//     console.error("Ошибка при экспорте CSV:", err);
//     await ctx.reply("❌ Ошибка при экспорте данных.", {
//       reply_markup: new InlineKeyboard().text("🔙 Назад", "back_to_admin"),
//     });
//   }
// });

bot.callbackQuery("view_stats", async (ctx) => {
  if (ctx.from.id !== adminId) {
    return ctx.answerCallbackQuery("⛔ У вас нет прав для этого.");
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const userCount = response.data.values ? response.data.values.length : 0;
    await ctx.editMessageText(`📊 Всего пользователей: ${userCount}`, {
      reply_markup: new InlineKeyboard().text("🔙 Назад", "back_to_admin"),
    });
  } catch (err) {
    console.error("Ошибка при получении статистики:", err);
    await ctx.editMessageText('❌ Ошибка при получении статистики.', {
			reply_markup: new InlineKeyboard().text('🔙 Назад', 'back_to_admin'),
		})
  }
});

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

async function saveToSheet(data) {
	const values = [
		[
			data.gender === 'male' ? 'Мужской' : 'Женский',
			occupationMap[data.occupation] || data.occupation,
			data.age,
			experienceMap[data.experience] || data.experience,
			incomeMap[data.current_income] || data.current_income,
			desiredMap[data.desired_income] || data.desired_income,
		],
	]

	const resource = {
		values,
	}

	try {
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range,
			valueInputOption: 'RAW',
			resource,
		})
		console.log('Данные успешно сохранены в Google Sheets')
	} catch (err) {
		console.error('Ошибка при сохранении данных:', err)
	}
}

const experienceMap = {
	'<1': 'Меньше 1 года',
	'1-year': '1 год',
	'2-4': '2-4 года',
	'5+': '5+ лет',
}

const occupationMap = {
	dev: 'Разработка',
	marketing: 'Маркетинг',
	sales: 'Продажи',
}

const incomeMap = {
	'30k': '0-30.000₽',
	'30-60k': '30.000₽-60.000₽',
	'120-180k': '120.000₽-180.000₽',
	'180k': '180.000₽+',
}

const desiredMap = {
	'50k': '50.000₽+',
	'100k': '100.000₽+',
	'200k': '200.000₽+',
	'300k': '300.000₽+',
}

bot.callbackQuery(["50k", "100k", "200k", "300k"], async (ctx) => {
	ctx.session.desired_income = ctx.callbackQuery.data;

  await saveToSheet({
    gender: ctx.session.gender === 'male' ? 'Мужской' : 'Женский',
    occupation: ctx.session.occupation,
    age: ctx.session.age,
    experience: ctx.session.experience,
    current_income: ctx.session.current_income,
    desired_income: ctx.session.desired_income,
  })

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

	await ctx.reply("✅ Спасибо! Теперь ты можешь получить обучение.", {
		reply_markup: new InlineKeyboard().text("📚 Получить урок", "lesson"),
	});

  await ctx.react('👀')

	await ctx.answerCallbackQuery();
});

bot.start()