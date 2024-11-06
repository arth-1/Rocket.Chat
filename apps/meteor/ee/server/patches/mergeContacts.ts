import type { ILivechatContact, ILivechatContactChannel } from '@rocket.chat/core-typings';
import { License } from '@rocket.chat/license';
import { LivechatContacts, LivechatRooms, Settings } from '@rocket.chat/models';

import { notifyOnSettingChanged } from '../../../app/lib/server/lib/notifyListener';
import { ContactMerger } from '../../../app/livechat/server/lib/contacts/ContactMerger';
import { mergeContacts } from '../../../app/livechat/server/lib/contacts/mergeContacts';
import { logger } from '../../app/livechat-enterprise/server/lib/logger';

export const runMergeContacts = async (_next: any, contactId: string, visitorId: string): Promise<ILivechatContact | null> => {
	const originalContact = await LivechatContacts.findOneById(contactId);
	if (!originalContact) {
		throw new Error('error-invalid-contact');
	}

	const channel = originalContact.channels?.find((channel: ILivechatContactChannel) => channel.visitorId === visitorId);
	if (!channel) {
		throw new Error('error-invalid-channel');
	}
	const similarContacts: ILivechatContact[] = await LivechatContacts.findSimilarVerifiedContacts(channel, contactId);

	if (!similarContacts.length) {
		return originalContact;
	}

	for await (const similarContact of similarContacts) {
		const fields = await ContactMerger.getAllFieldsFromContact(similarContact);
		await ContactMerger.mergeFieldsIntoContact(fields, originalContact);
	}

	const similarContactIds = similarContacts.map((c) => c._id);
	const { deletedCount } = await LivechatContacts.deleteMany({ _id: { $in: similarContactIds } });

	const { value } = await Settings.incrementValueById('Merged_Contacts_Count', similarContacts.length, { returnDocument: 'after' });
	if (value) {
		void notifyOnSettingChanged(value);
	}
	logger.info(
		`${deletedCount} contacts (ids: ${JSON.stringify(similarContactIds)}) have been deleted and merged with contact with id ${
			originalContact._id
		}`,
	);

	await LivechatRooms.updateMany({ 'v.contactId': { $in: similarContactIds } }, { $set: { 'v.contactId': contactId } });

	return LivechatContacts.findOneById(contactId);
};

mergeContacts.patch(runMergeContacts, () => License.hasModule('contact-id-verification'));
