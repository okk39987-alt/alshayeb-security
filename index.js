const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const http = require('http');

// ✅ Keep-Alive Server (لمنع النوم على Render)
http.createServer((req, res) => res.end('ALshayeb Security is alive!')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// متغير لحالة الحماية (مفعلة افتراضياً)
let isSecurityActive = true;

// قائمة السب الثقيل والكلمات الممنوعة فقط
const badWords = [
    'كلب', 'حمار', 'ابن الهرمه', 'قحبة', 'منيوك', 'كل زق', 'يعرص', 'شرموط', 'خنيث',
    'منيوكة', 'شرموطة', 'عرص', 'ديوث', 'ديوثة', 'ابن الكلب', 'ابن الحمار', 'ابن الـ', 
    'خول', 'ياديوث', 'ياعرص', 'ياشرموط', 'قواحيب', 'خرا', 'طيز', 'كس', 'طيزك',
    'كسك', 'أير', 'زبر', 'قضيب', 'منيوك ابن قحبة', 'ابن الشرموطة', 'شرااميط', 'قحااب', 
    'منياك', 'خوال', 'ديوثين', 'عراص', 'ابن الوسخة', 'عرص ابن عرص'
];

client.on('ready', () => {
    console.log(`✅ بوت الحماية شغال باسم: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // أمر تشغيل وإيقاف الحماية (للمشرفين فقط)
    if (message.content.startsWith('!security')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ ما عندك صلاحية للتحكم بأمر الحماية!');
        }

        const args = message.content.split(' ')[1];
        if (args === 'on') {
            isSecurityActive = true;
            return message.reply('🟢 **تم تفعيل نظام الحماية والفلتر بنجاح!**');
        } else if (args === 'off') {
            isSecurityActive = false;
            return message.reply('🔴 **تم إيقاف نظام الحماية والفلتر مؤقتاً!**');
        } else {
            return message.reply('⚠️ الاستخدام الصحيح:\n`!security on` لتفعيل الحماية\n`!security off` لإيقاف الحماية');
        }
    }

    // إذا كانت الحماية مطفية، لا يسوي شي
    if (!isSecurityActive) return;

    // استثناء للإدارة
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    // إزالة المسافات والرموز لمنع التلاعب
    let content = message.content.toLowerCase().replace(/[\s\-_~.]+/g, '');

    // 1. نظام منع الروابط
    if (message.content.includes('http://') || message.content.includes('https://') || message.content.includes('www.')) {
        try {
            await message.delete();
            message.channel.send(`⚠️ ${message.author}, ممنوع نشر الروابط هنا!`).then(msg => {
                setTimeout(() => msg.delete(), 5000);
            });
        } catch (err) {
            console.log('ما قدرت أحذف الرابط');
        }
        return;
    }

    // 2. نظام منع السب الثقيل
    for (let word of badWords) {
        let cleanWord = word.toLowerCase().replace(/[\s\-_~.]+/g, '');
        if (content.includes(cleanWord)) {
            try {
                await message.delete();
                message.channel.send(`⚠️ ${message.author}, ممنوع استخدام هذه الكلمات في السيرفر!`).then(msg => {
                    setTimeout(() => msg.delete(), 5000);
                });
            } catch (err) {
                console.log('ما قدرت أحذف رسالة السب');
            }
            return;
        }
    }
});

client.login(process.env.TOKEN);
