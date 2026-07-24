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

// قائمة السب الثقيل والكلمات الممنوعة فقط (بدون شتايم عادية)
const badWords = [
    'كلب', 'حمار', 'ابن الهرمه', 'قحبة', 'منيوك', 'كل زق', 'يعرص', 'شرموط', 'خنيث',
    'منيوكة', 'شرموطة', 'عرص', 'ديوث', 'ديوثة', 'ابن الكلب', 'ابن الحمار', 'ابن الـ', 
    'خول', 'ياديوث', 'ياعرص', 'ياشرموط', 'قواحيب', 'خرا', 'طيز', 'كس', 'طيزك',
    'كسك', 'أير', 'زبر', 'قضيب', 'منيوك ابن قحبة', 'ابن الشرموطة', 'شرااميط', 'قحااب', 
    'منياك', 'خوال', 'ديوثين', 'عراص', 'ابن الوسخة', 'عرص ابن عرص'
];

client.on('ready', () => {
    console.log(`✅ بوت الحماية (فلتر السب الثقيل) شغال باسم: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

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
