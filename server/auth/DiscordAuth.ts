import { Profile, Scope, Strategy, VerifyCallback } from '@oauth-everything/passport-discord';
import { AuthenticationClient } from "./AuthenticationClient";
import { IUser } from './IUser';
import { Request } from 'express';
import { container, injectable } from "tsyringe";
import axios from 'axios';
import consola from "consola";
import passport from "passport";
import { Client, GuildMember } from 'discord.js';
import DiscordBot from '../DiscordBot';

@injectable()
export class DiscordAuthentication extends AuthenticationClient {
    clientID = process.env.DISCORD_CLIENT_ID || '';
    clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    callbackURL = process.env.DISCORD_CALLBACK_URL || '';
    RootURL = "/discord";
    private guildId: string = process.env.DISCORD_GUILD_ID as string || '';

    constructor(scopes: Scope[]) {
        super();

        if (!this.VarsPresent())
            return;

        if (scopes.includes(Scope.GUILDS_JOIN) && this.StrIsEmpty(this.guildId)) {
            consola.error(`Cannot use scope ${Scope.GUILDS_JOIN} when no guild id present.`);
            return;
        }

        consola.info("Setting up Discord authentication routes...")

        passport.use(new Strategy({
            clientID: this.clientID,
            clientSecret: this.clientSecret,
            callbackURL: this.callbackURL,
            scope: scopes,
            passReqToCallback: true
        }, (req: Request, accessToken: string, refreshToken: string, profile: Profile, cb: VerifyCallback<any>) => {
            if (!req.user)
                return cb(new Error("User has not connected osu! account first, or cookie got lost."), null);
            else {
                if (req.user === null)
                    return cb(new Error("User in request is null"), null);

                const o: IUser = req.user as any;

                o.discord.id = profile.id;
                o.discord.displayName = profile.username;
                o.discord.token = accessToken
                this.discordJoin(o.discord.id, accessToken, o.osu.displayName!);
                return cb(null, o);
            }
        }));

        this.AddRoutes("discord", '/done');

        consola.success("Discord authentication routes are registered.")
    }

    private async discordJoin(userId: string, token: string, nickname: string) {
        try {
            const response = await axios.put(`https://discordapp.com/api/guilds/${this.guildId}/members/${userId}`, {
                access_token: token,
                nick: nickname
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
                }
            });

            // User has joined the guild through the request
            if (response.status === 201)
                consola.success(`Joined ${userId} to the server!`)
            // User was already in the server.
            else if (response.status === 204)
                consola.success("User already in guild");

            this.addRoles(userId, nickname)
        } catch (e) {
            consola.error(`An error occured while trying to join ${userId} Detailed error description: ${e}`);
        }
    }

    private async addRoles(userId: string, nickname: string) {
        const client = container.resolve<Client>(Client) as DiscordBot;
        const guild = client.guilds.cache.get(this.guildId);

        if (guild === undefined)
            return;

        await guild.members.fetch()
        const guildMember = guild.members.cache.get(userId);
        const role = guild.roles.cache.find(role => role.name === 'Verified');

        if (role === undefined)
            return;
        
        if (guildMember === undefined)
            return;

        await guildMember.roles.add(role);
        await this.changeNickName(nickname, guildMember);
        client.emit('userVerified', guild, guildMember);
        consola.success(`Verified ${guildMember.user.username} / ${userId}`);
    }

    private async changeNickName(nickname: string, member: GuildMember) {
        try {
            await member.setNickname(nickname, "Changed nickname to osu! username");
        } catch (e) {
            consola.error(e);
        }
    }
}