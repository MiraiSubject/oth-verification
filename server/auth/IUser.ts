import { DateTime } from "luxon";

export interface IUser {
    discord: {
        id?: string;
        displayName?: string;
        token?: string;
    }
    osu: {
        id?: string;
        displayName?: string;
        token?: string;
        joinDate?: DateTime;
    }
    failureReason?: string;
}
