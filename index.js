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
    console.log(`✅ بوت الحماية (فلتر السب والروابط) شغال باسم ${client.user.tag}`);
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
            return message.reply('🛡️ **تم تفعيل نظام الحماية (فلتر السب والروابط) بنجاح!**');
        } else if (action === 'off') {
            protectionStatus.set(message.guild.id, false);
            return message.reply('⚠️ **تم إيقاف نظام الحماية (فلتر السب والروابط).**');
        } else {
            const current = protectionStatus.get(message.guild.id) !== false ? 'مفعلة ✅' : 'متوقفة ❌';
            return message.reply(`ℹ️ حالة الحماية الحالية في السيرفر: **${current}**\nللتفعيل اكتب: \`!security on\`\nلإيقافها اكتب: \`!security off\``);
        }
    }

    // التحقق هل الحماية مفعلة في هذا السيرفر أم لا (افتراضياً مفعلة)
    const isProtected = protectionStatus.get(message.guild.id);
    if (isProtected === false) return;

    // استثناء للإدارة (المشرفين ما ينطبق عليهم الحذف أو التيموت)
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    let violationReason = null;

    // 1. فحص الروابط (تشمل الروابط العادية ورابط دعوات ديسكورد discord.gg)
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
    if (linkRegex.test(message.content)) {
        violationReason = 'إرسال روابط ممنوعة';
    } else {
        // 2. فحص الكلمات الممنوعة (مع إزالة المسافات والرموز المتكررة لمنع التلاعب)
        let content = message.content.toLowerCase().replace(/[\s\-_.#+]+/g, '');
        for (let word of badwords) {
            let cleanWord = word.toLowerCase().replace(/[\s\-_.#+]+/g, '');
            if (content.includes(cleanWord)) {
                violationReason = 'استخدام ألفاظ سيئة';
                break;
            }
        }
    }

    // إذا تم رصد أي مخالفة (رابط أو لفظ سيء)
    if (violationReason) {
        try {
            // حذف الرسالة فوراً
            await message.delete().catch(() => {});

            // جلب العضو للتأكد من تحميله في الذاكرة
            let member = message.member;
            if (!member) {
                member = await message.guild.members.fetch(message.author.id).catch(() => null);
            }

            if (member) {
                // حساب مدة أسبوع بالمللي ثانية (7 أيام)
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                
                // إعطاء العضو تيموت لمدة أسبوع بالطريقة المتوافقة مع الإصدارات الحديثة
                await member.timeout(oneWeek, { reason: violationReason });

                // إرسال تحذير مؤقت يحذف تلقائياً بعد 4 ثواني
                let warning = await message.channel.send(`⚠️ ${message.author}, ممنوع ${violationReason} في السيرفر وتم إعطاؤك تيموت لمدة أسبوع!`);
                setTimeout(() => warning.delete().catch(() => {}), 4000);
            }
        } catch (err) {
            console.log('خطأ في تنفيذ الإجراء (تأكد من صلاحيات البوت):', err);
        }
    }
});

client.login(process.env.TOKEN);
