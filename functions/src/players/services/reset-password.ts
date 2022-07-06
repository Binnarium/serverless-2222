import * as functions from "firebase-functions";
import { AuthInstance } from "../../utils/configuration";

export const PLAYER_resetPassword = functions.https.onCall(async (data: { email?: string }, _) => {
    const playerEmail = data?.email ?? null;

    /// validate params required are valid
    if (playerEmail === null)
        return { ok: false, code: 'missing-email', message: 'Missing the parameter playerEmail' };


    const link = await AuthInstance.generatePasswordResetLink(playerEmail);

    return { ok: true, link, playerEmail };
});