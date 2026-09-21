import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { i18n } from "../utils/i18n";

export default {
  data: new SlashCommandBuilder()
  .setName("dev")
  .setDescription(i18n.__("dev.description")),
  async execute(interaction: CommandInteraction) {
    const servers = interaction.client.guilds.cache.size;

    interaction.reply({ content: i18n.__mf("dev.result", { servers: servers }) }).catch(console.error);
  },
};