import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { bot } from "../index";
import { i18n } from "../utils/i18n";

export default {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription(i18n.__("leave.description")),
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!bot.isInVoice()) {
      return interaction.reply({
        content: i18n.__("leave.noConnection"),
        ephemeral: true
      });
    }

    try {
      bot.leaveVoice();
      return interaction.reply({
        content: i18n.__("leave.success"),
        ephemeral: false
      });
    } catch (err: any) {
      console.error("Error al salir del canal de voz:", err);
      return interaction.reply({
        content: `Error al desconectarse: ${err.message || err}`,
        ephemeral: true
      });
    }
  }
};
