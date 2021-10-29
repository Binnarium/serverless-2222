import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { CollectionWatcher } from "../models/collection-watcher.model";
import { ContributionScreenModel } from "../models/contribution-screen.model";

/**
 * when the pub url are updated in the contribution document of each city
 * 
 * Create watchers on each url so that pubs under each collection are query later
 */
export const CONTRIBUTIONS_updateCollectionsWatchers = functions.firestore
    .document('cities/{cityId}/pages/contribution')
    .onUpdate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();
        const cityId = context.params.cityId;

        const oldContribution = <ContributionScreenModel | null | undefined>snapshot.before.data();
        const newContribution = <ContributionScreenModel | null | undefined>snapshot.after.data();


        const urls: Array<[string | null, string | null]> = [
            [oldContribution?.teachingPractice ?? null, newContribution?.teachingPractice ?? null],
            [oldContribution?.educativeEducations ?? null, newContribution?.educativeEducations ?? null],
            [oldContribution?.governmentManagement ?? null, newContribution?.governmentManagement ?? null],
        ];

        /// update all urls
        urls.forEach(([oldUrl, newUrl]) => updateUrls(batch, oldUrl, newUrl, cityId));

        await batch.commit();
    });

function updateUrls(batch: FirebaseFirestore.WriteBatch, oldUrl: string | null, newUrl: string | null, cityId: string) {
    /// update the pubs watchers only when the url changes
    if ((!!oldUrl || !!newUrl) && oldUrl === newUrl)
        return;

    /// delete old watcher ref
    if (!!oldUrl) {
        const oldWatchSlug = getCollectionSlug(oldUrl);
        if (!!oldWatchSlug) {
            const ref = FirestoreInstance.collection('contributions').doc('_configuration_')
                .collection('collection-watchers').doc(oldWatchSlug);
            batch.delete(ref);
        }
    }

    /// create new watcher
    if (newUrl) {
        const watcherSlug = getCollectionSlug(newUrl);
        if (!!watcherSlug) {
            const ref = FirestoreInstance.collection('contributions').doc('_configuration_')
                .collection('collection-watchers').doc(watcherSlug);

            const data: CollectionWatcher = {
                cityId,
                pubCollectionUrl: newUrl,
                id: watcherSlug,
                scrapedAt: firestore.FieldValue.serverTimestamp()
            };

            batch.set(ref, data);
        }
    }

}

function getCollectionSlug(originalUrl: string): string | null {
    const splittedContent = originalUrl.split('/');
    const pubIndex = splittedContent.findIndex(e => e === "lab-movil-2222.pubpub.org");
    if (pubIndex < 0)
        return null;
    return splittedContent[pubIndex + 1];
}