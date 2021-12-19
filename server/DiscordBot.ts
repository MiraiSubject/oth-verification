import { Client, Guild, GuildMember, Intents, TextChannel } from 'discord.js';
import { singleton } from 'tsyringe';

import { ClientEvents } from 'discord.js';

interface EventList extends ClientEvents {
    joinedThroughWeb: [userId: string];
}

@singleton()
export default class DiscordBot extends Client {
    constructor() {
        super({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS], partials: ['USER'] })

        this.once('ready', () => {
            console.log(`o!th bot is ready`)
        });

        this.on('userVerified', (guild: Guild, member: GuildMember) => {
            const channel = guild.channels.cache.find(c => c.name === 'general') as TextChannel;
            channel.send(`Welcome ${member} you are now verified!`)
        })

        this.login(process.env.DISCORD_BOT_TOKEN)
    }
}


