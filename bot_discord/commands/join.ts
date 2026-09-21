import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder, VoiceBasedChannel } from "discord.js";
import { bot } from "../index";
import { i18n } from "../utils/i18n";

export default {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription(i18n.__("join.description")),
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel as VoiceBasedChannel;

    if (!voiceChannel) {
      return interaction.reply({
        content: i18n.__("join.noChannel"),
        ephemeral: true
      });
    }

    try {
      bot.joinVoice(voiceChannel);
      return interaction.reply({
        content: i18n.__mf("join.success", { channel: voiceChannel.name }),
        ephemeral: false
      });
    } catch (err: any) {
      console.error("Error al unirse al canal de voz:", err);
      return interaction.reply({
        content: `Error al unirse al canal: ${err.message || err}`,
        ephemeral: true
      });
    }
  }
};
