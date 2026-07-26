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

// قائمة السب الثقيل والكلمات الممنوعة
const badWords = [
    'كلب', 'حمار', 'ابن الهرمه', 'قحبة', 'منيوك', 'كل زق', 'يعرص', 'شرموط', 'خنيث',
    'منيوكة', 'شرموطة', 'عرص', 'ديوث', 'ديوثة', 'ابن الكلب', 'ابن الحمار', 'خول', 
    'ياديوث', 'ياعرص', 'ياشرموط', 'قواحيب', 'خرا', 'طيز', 'كس', 'طيزك',
    'كسك', 'أير', 'زبر', 'قضيب', 'منياك', 'خوال', 'ديوثين', 'عراص', 'ابن الوسخة'
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

    // 1. نظام منع الروابط مع "الباند التلقائي" (يطبق على الجميع بدون استثناء)
    if (message.content.includes('http://') || message.content.includes('https://') || message.content.includes('www.') || message.content.includes('discord.gg/')) {
        try {
            await message.delete();
            await message.member.ban({ reason: 'نشر روابط ممنوعة في السيرفر' });

            const warning = await message.channel.send(`🚨 ${message.author.tag} تم تبنيده تلقائياً بسبب نشر الروابط!`);
            setTimeout(() => warning.delete().catch(() => {}), 5000);
        } catch (err) {
            console.log('ما قدرت أعطي باند للعضو (تأكد أن رتبة البوت أعلى من رتبة المستهدف وأن لديه صلاحية Ban Members)');
        }
        return;
    }

    // 2. نظام منع السب الثقيل (يحذف الرسالة فقط للجميع)
    let contentWords = message.content.toLowerCase().split(/\s+/);
    
    for (let word of badWords) {
        let cleanWord = word.toLowerCase().replace(/[\s\-_~.]+/g, '');
        
        let isBad = contentWords.some(w => {
            let cleanW = w.replace(/[\s\-_~.,?!@#$%^&*()+=]+/g, '');
            return cleanW === cleanWord;
        });

        if (isBad) {
            try {
                await message.delete();
                const warning = await message.channel.send(`⚠️ ${message.author}, ممنوع استخدام هذه الكلمات في السيرفر!`);
                setTimeout(() => warning.delete().catch(() => {}), 5000);
            } catch (err) {
                console.log('ما قدرت أحذف رسالة السب');
            }
            return;
        }
    }
});

client.login(process.env.TOKEN);
