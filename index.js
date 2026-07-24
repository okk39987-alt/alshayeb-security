const http = require('http');
http.createServer((req, res) => res.end('Protection Bot is running!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// متغير لتخزين حالة الحماية (مفعلة افتراضياً لكل سيرفر)
const protectionStatus = new Map();

// قائمة السب والكلمات الممنوعة
const badwords = [
    'كلب', 'حمار', 'ابن الحرمه', 'قحبة', 'منيوك', 'كل زق', 'يعرس', 'شرموط', 'حنيث',
    'منيوكة', 'شرموطة', 'عرص', 'ديوث', 'ديوثة', 'ابن الكلب', 'ابن الحمار', 'ابن الـ',
    'خول', 'ياديوت', 'ياعرص', 'يالترموط', 'قواحيب', 'خرا', 'طيز', 'كس', 'طيزك',
    'كسك', 'أير', 'زير', 'قضيب', 'منيوك ابن قحبة', 'ابن الشرموطة', 'شراميط', 'قحاب',
    'منياك', 'خوال', 'ديوثين', 'عراض', 'ابن الوسخة', 'ابن ابن عرص'
];

client.on('ready', () => {
    console.log(`✅ بوت الحماية (فلتر السب) شغال باسم ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // أمر التفعيل والإيقاف
    if (message.content.startsWith('!security')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ ما عندك صلاحية لإستخدام هذا الأمر!');
        }

        const args = message.content.split(' ');
        const action = args[1];

        if (action === 'on') {
            protectionStatus.set(message.guild.id, true);
            return message.reply('🛡️ **تم تفعيل نظام الحماية (فلتر السب) بنجاح!**');
        } else if (action === 'off') {
            protectionStatus.set(message.guild.id, false);
            return message.reply('⚠️ **تم إيقاف نظام الحماية (فلتر السب).**');
        } else {
            const current = protectionStatus.get(message.guild.id) !== false ? 'مفعلة ✅' : 'متوقفة ❌';
            return message.reply(`ℹ️ حالة الحماية الحالية في السيرفر: **${current}**\nللتفعيل اكتب: \`!security on\`\nلإيقافها اكتب: \`!security off\``);
        }
    }

    // التحقق هل الحماية مفعلة في هذا السيرفر أم لا (افتراضياً مفعلة)
    const isProtected = protectionStatus.get(message.guild.id);
    if (isProtected === false) return;

    // استثناء للإدارة
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    // إزالة المسافات والرموز لمنع التلاعب
    let content = message.content.toLowerCase().replace(/[\s\-_.#+]+/g, '');

    // فحص الكلمات الممنوعة
    for (let word of badwords) {
        let cleanWord = word.toLowerCase().replace(/[\s\-_.#+]+/g, '');
        if (content.includes(cleanWord)) {
            try {
                await message.delete();
                let warning = await message.channel.send(`⚠️ ${message.author}, ممنوع استخدام هذا اللفظ في السيرفر!`);
                setTimeout(() => warning.delete().catch(() => {}), 4000);
            } catch (err) {
                console.log('خطأ في حذف رسالة السب:', err);
            }
            break;
        }
    }
});

client.login(process.env.TOKEN);
