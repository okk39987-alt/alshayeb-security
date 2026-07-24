require("dotenv").config();
const fs = require("fs");
const path = require("path");

const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, PermissionsBitField, ChannelType,
  ButtonBuilder, ButtonStyle, Events, ModalBuilder,
  TextInputBuilder, TextInputStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN         = process.env.DISCORD_TOKEN;
const CATEGORY_ID   = process.env.CATEGORY_ID   || null;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || null;
const LOGO_URL      = process.env.LOGO_URL      || null;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || null;

const DATA_FILE = path.join(__dirname, "tickets_data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { counter: 0, openTickets: {}, closedCount: 0 };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function isStaff(member) {
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (STAFF_ROLE_ID && member.roles.cache.has(STAFF_ROLE_ID)) return true;
  return false;
}

const ticketTypeLabels = {
  tech_support:  "الدعم الفني 🛠️",
  complaint:     "تقديم شكوى ⚠️",
  shayeb_group:  "تقديم قروب الشايب 👴",
};

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} جاهز وشغال!`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!ticket")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ هذا الأمر للأعضاء الإداريين فقط.");
    }

    const embed = new EmbedBuilder()
      .setTitle("Al-Shayeb Tickets")
      .setDescription(
        `قوانين التذاكر\n` +
        `• الإحترام واجب وعدم التهجم في التكت.\n` +
        `• يمنع النقاش مجداً.\n` +
        `• في حال قمت بفتح تكت أدخل بالموضوع.\n` +
        `• يمنع السب والشتم والإهانة.\n\n` +
        `**يجب عليك تعبئة البيانات قبل فتح التذكرة بشكل كامل**`
      )
      .setColor("#0099ff")
      .setFooter({ text: "Powered By | Al-Shayeb Bot", iconURL: LOGO_URL || undefined });
    if (LOGO_URL) embed.setImage(LOGO_URL);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("اختر نوع التذكرة")
      .addOptions([
        { label: "الدعم الفني",            description: "فتح تذكرة لمساعدة تقنية",            value: "tech_support",  emoji: "🛠️" },
        { label: "تقديم شكوى",             description: "فتح تذكرة لتقديم شكوى",               value: "complaint",     emoji: "⚠️" },
        { label: "تقديم قروب الشايب",    description: "لتقديم الانضمام إلى قروب الشايب",       value: "shayeb_group",  emoji: "👴" },
        { label: "🔄 إعادة ضبط الاختيار", description: "اضغط هنا إذا تعلقت القائمة",           value: "reset" },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await message.channel.send({ content: "@everyone", embeds: [embed], components: [row] });
    message.delete().catch(() => {});
  }

  if (message.content.startsWith("!stats")) {
    if (!isStaff(message.member)) return message.reply("❌ هذا الأمر للإدارة فقط.");
    const data = loadData();
    const openCount = Object.keys(data.openTickets).length;
    const embed = new EmbedBuilder()
      .setTitle("📊 إحصائيات التذاكر")
      .setColor("#0099ff")
      .addFields(
        { name: "🟢 مفتوحة",  value: `${openCount}`,           inline: true },
        { name: "🔴 مغلقة",   value: `${data.closedCount || 0}`, inline: true },
        { name: "📝 الإجمالي", value: `${data.counter}`,          inline: true },
      );
    return message.reply({ embeds: [embed] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const selected = interaction.values[0];

    if (selected === "reset") {
      return interaction.reply({
        content: "🔄 تم إعادة ضبط الاختيار بنجاح، يمكنك اختيار نوع التذكرة مرة أخرى.",
        flags: 1 << 6,
      });
    }

    const data = loadData();
    if (data.openTickets[interaction.user.id]) {
      const existingChannel = interaction.guild.channels.cache.get(data.openTickets[interaction.user.id]);
      if (existingChannel) {
        return interaction.reply({
          content: `⚠️ لديك تذكرة مفتوحة بالفعل: ${existingChannel}\nأغلقها أولاً قبل فتح تذكرة جديدة.`,
          flags: 1 << 6,
        });
      }
      delete data.openTickets[interaction.user.id];
      saveData(data);
    }

    if (selected === "shayeb_group") {
      await interaction.deferReply({ flags: 1 << 6 });

      try {
        const guild = interaction.guild;
        data.counter += 1;
        const ticketNumber = String(data.counter).padStart(4, "0");
        const channelName = `ticket-${ticketNumber}`;
        const ticketTypeLabel = ticketTypeLabels[selected];

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            ...(STAFF_ROLE_ID ? [{ id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }] : []),
          ],
        });

        data.openTickets[interaction.user.id] = ticketChannel.id;
        saveData(data);

        const ticketEmbed = new EmbedBuilder()
          .setTitle("أهلاً بك في التذكرة | Al-Shayeb")
          .setDescription(
            `مرحباً ${interaction.user}، أهلاً بك في تقديم قروب الشايب.\n\n` +
            `👤 **صاحب التذكرة:** ${interaction.user}\n` +
            `🎫 **نوع التذكرة:** ${ticketTypeLabel}\n\n` +
            `🛠️ **الحالة:** بانتظار استلام الإدارة`
          )
          .setColor("#0099ff");
        if (LOGO_URL) ticketEmbed.setImage(LOGO_URL);

        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close_ticket").setLabel("إغلاق التذكرة 🔒").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("claim_ticket").setLabel("استلام التذكرة ✋").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("remind_user").setLabel("تذكير العضو 🔔").setStyle(ButtonStyle.Secondary),
        );

        const staffMention = STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : "";
        await ticketChannel.send({
          content: `ticket_owner_id:${interaction.user.id} | ${staffMention} | ${interaction.user}`,
          embeds: [ticketEmbed],
          components: [buttonsRow],
        });

        return await interaction.editReply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}` });

      } catch (error) {
        console.error(error);
        return await interaction.editReply({ content: "❌ حدث خطأ، تأكد من الأيدي والصلاحيات." });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal:${selected}`)
      .setTitle("تفاصيل التذكرة");

    const issueInput = new TextInputBuilder()
      .setCustomId("issue_description")
      .setLabel("اشرح مشكلتك أو طلبك بالتفصيل")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("اكتب هنا...")
      .setMinLength(10)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(issueInput));
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
    const ticketType      = interaction.customId.split(":")[1];
    const issueDescription = interaction.fields.getTextInputValue("issue_description");

    await interaction.deferReply({ flags: 1 << 6 });

    try {
      const guild = interaction.guild;
      const data  = loadData();
      data.counter += 1;
      const ticketNumber  = String(data.counter).padStart(4, "0");
      const channelName   = `ticket-${ticketNumber}`;
      const ticketTypeLabel = ticketTypeLabels[ticketType] || ticketType;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
          ...(STAFF_ROLE_ID ? [{
            id: STAFF_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          }] : []),
        ],
      });

      data.openTickets[interaction.user.id] = ticketChannel.id;
      saveData(data);

      const ticketEmbed = new EmbedBuilder()
        .setTitle("أهلاً بك في التذكرة | Al-Shayeb")
        .setDescription(
          `مرحباً ${interaction.user}، يرجى الانتظار وسيقوم فريق الإدارة بالرد عليك قريباً.\n\n` +
          `👤 **صاحب التذكرة:** ${interaction.user}\n` +
          `🎫 **نوع التذكرة:** ${ticketTypeLabel}\n` +
          `📝 **المشكلة:** ${issueDescription}\n\n` +
          `🛠️ **الحالة:** بانتظار استلام الإدارة`
        )
        .setColor("#0099ff");
      if (LOGO_URL) ticketEmbed.setImage(LOGO_URL);

      const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("إغلاق التذكرة 🔒").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("claim_ticket").setLabel("استلام التذكرة ✋").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("remind_user").setLabel("تذكير العضو 🔔").setStyle(ButtonStyle.Secondary),
      );

      const staffMention = STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : "";
      await ticketChannel.send({
        content: `ticket_owner_id:${interaction.user.id} | ${staffMention} | ${interaction.user}`,
        embeds: [ticketEmbed],
        components: [buttonsRow],
      });

      try {
        const ticketUrl = `https://discord.com/channels/${guild.id}/${ticketChannel.id}`;
        const welcomeEmbed = new EmbedBuilder()
          .setTitle("🎫 تم فتح تذكرتك!")
          .setDescription(
            `أهلاً ${interaction.user}، تم فتح تذكرتك بنجاح في سيرفر **${guild.name}**.\n` +
            `سيقوم فريق الإدارة بالرد عليك قريباً، يرجى الانتظار.`
          )
          .setColor("#00cc66");
        const welcomeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("رابط التذكرة").setStyle(ButtonStyle.Link).setURL(ticketUrl).setEmoji("🎫")
        );
        await interaction.user.send({ embeds: [welcomeEmbed], components: [welcomeRow] });
      } catch (_) {}

      await interaction.editReply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}` });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: "❌ حدث خطأ، تأكد من الأيدي والصلاحيات." });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "close_ticket") {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: "❌ هذا الزر للإدارة فقط.", flags: 1 << 6 });
      }

      await interaction.reply({ content: "🔒 سيتم إغلاق التذكرة خلال 3 ثوانٍ..." });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const ownerMsg  = messages.find((m) => m.content && m.content.includes("ticket_owner_id:"));
      let ticketOwnerId = null;
      if (ownerMsg) {
        const match = ownerMsg.content.match(/ticket_owner_id:(\d+)/);
        if (match) ticketOwnerId = match[1];
      }

      if (LOG_CHANNEL_ID) {
        try {
          const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            const sorted = [...messages.values()].reverse();
            const transcript = sorted
              .map((m) => `[${m.author.tag}]: ${m.content || (m.embeds.length ? "(embed)" : "")}`)
              .filter(Boolean)
              .join("\n");

            const logEmbed = new EmbedBuilder()
              .setTitle(`📋 سجل التذكرة | ${interaction.channel.name}`)
              .setDescription(
                `**أُغلقت بواسطة:** ${interaction.user}\n` +
                `**الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`
              )
              .setColor("#ff4444");
            await logChannel.send({ embeds: [logEmbed] });

            if (transcript.length > 0) {
              const chunks = transcript.match(/.{1,1900}/gs) || [];
              for (const chunk of chunks.slice(0, 5)) {
                await logChannel.send({ content: `\`\`\`\n${chunk}\n\`\`\`` });
              }
            }
          }
        } catch (e) { console.error("[log]", e.message); }
      }

      if (ticketOwnerId) {
        try {
          const owner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => null);
          if (owner) {
            const ratingEmbed = new EmbedBuilder()
              .setTitle("⭐ كيف كانت تجربتك؟")
              .setDescription(
                `شكراً لتواصلك مع **${interaction.guild.name}**!\n` +
                `يرجى تقييم جودة الدعم الذي تلقيته.`
              )
              .setColor("#ffd700");
            const ratingRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("rating:1").setLabel("1 ⭐").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("rating:2").setLabel("2 ⭐").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("rating:3").setLabel("3 ⭐").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("rating:4").setLabel("4 ⭐").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("rating:5").setLabel("5 ⭐").setStyle(ButtonStyle.Success),
            );
            await owner.user.send({ embeds: [ratingEmbed], components: [ratingRow] });
          }
        } catch (_) {}
      }

      const data = loadData();
      if (ticketOwnerId) delete data.openTickets[ticketOwnerId];
      data.closedCount = (data.closedCount || 0) + 1;
      saveData(data);

      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    else if (interaction.customId === "claim_ticket") {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: "❌ هذا الزر للإدارة فقط.", flags: 1 << 6 });
      }
      await interaction.reply({ content: `✅ تم استلام التذكرة بواسطة ${interaction.user}` });
    }

    else if (interaction.customId === "remind_user") {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: "❌ هذا الزر للإدارة فقط.", flags: 1 << 6 });
      }
      try {
        let targetUser = null;
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const ownerMsg  = messages.find((m) => m.content && m.content.includes("ticket_owner_id:"));
        if (ownerMsg) {
          const match = ownerMsg.content.match(/ticket_owner_id:(\d+)/);
          if (match && match[1]) targetUser = await interaction.guild.members.fetch(match[1]).catch(() => null);
        }
        if (!targetUser) {
          for (const [id] of interaction.channel.permissionOverwrites.cache) {
            if (id !== interaction.guild.id && id !== STAFF_ROLE_ID) {
              const member = await interaction.guild.members.fetch(id).catch(() => null);
              if (member && !member.user.bot) { targetUser = member; break; }
            }
          }
        }
        if (targetUser) {
          const ticketUrl = `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`;
          const dmEmbed = new EmbedBuilder()
            .setTitle("🔔 تذكير بالتذكرة")
            .setDescription(`أهلاً ${targetUser.user}، يرجى الرد على تذكرتك في سيرفر **${interaction.guild.name}** بمتابعة موضوعك.`)
            .setColor("#0099ff");
          const dmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel("رابط التذكرة").setStyle(ButtonStyle.Link).setURL(ticketUrl).setEmoji("🎫")
          );
          await targetUser.user.send({ embeds: [dmEmbed], components: [dmRow] });
          return interaction.reply({ content: `✅ تم إرسال تذكير بالخاص لـ ${targetUser.user.tag}!`, flags: 1 << 6 });
        } else {
          return interaction.reply({ content: "⚠️ لم يتم العثور على صاحب التذكرة.", flags: 1 << 6 });
        }
      } catch (err) {
        return interaction.reply({ content: "❌ تعذر إرسال رسالة خاصة. تأكد أن العضو يتيح استقبال الرسائل الخاصة.", flags: 1 << 6 });
      }
    }

    else if (interaction.customId.startsWith("rating:")) {
      const stars = interaction.customId.split(":")[1];
      const starsDisplay = "⭐".repeat(parseInt(stars));
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("شكراً على تقييمك! 🙏")
            .setDescription(`قيّمت الخدمة بـ **${starsDisplay} (${stars}/5)**\nنسعى دائماً للتحسين!`)
            .setColor("#00cc66"),
        ],
        components: [],
      });
    }
  }
});

client.login(TOKEN);