import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { bot } from "../index";
import { i18n } from "../utils/i18n";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription(i18n.__("stop.description")),
  cooldown: 2,
  async execute(interaction: ChatInputCommandInteraction) {
    bot.stopSound();
    return interaction.reply({
      content: i18n.__("stop.success"),
      ephemeral: true
    });
  }
};
