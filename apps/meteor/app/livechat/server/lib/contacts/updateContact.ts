import type { ILivechatContact, ILivechatContactChannel } from '@rocket.chat/core-typings';
import { LivechatContacts, Settings } from '@rocket.chat/models';

import { notifyOnSettingChanged } from '../../../../lib/server/lib/notifyListener';
import { getAllowedCustomFields } from './getAllowedCustomFields';
import { validateContactManager } from './validateContactManager';
import { validateCustomFields } from './validateCustomFields';

export type UpdateContactParams = {
	contactId: string;
	name?: string;
	emails?: string[];
	phones?: string[];
	customFields?: Record<string, unknown>;
	contactManager?: string;
	channels?: ILivechatContactChannel[];
	wipeConflicts?: boolean;
};

export async function updateContact(params: UpdateContactParams): Promise<ILivechatContact> {
	const { contactId, name, emails, phones, customFields: receivedCustomFields, contactManager, channels, wipeConflicts } = params;

	const contact = await LivechatContacts.findOneById<Pick<ILivechatContact, '_id' | 'conflictingFields'>>(contactId, {
		projection: { _id: 1, conflictingFields: 1 },
	});

	if (!contact) {
		throw new Error('error-contact-not-found');
	}

	if (contactManager) {
		await validateContactManager(contactManager);
	}

	if (wipeConflicts && contact.conflictingFields?.length) {
		const { value } = await Settings.incrementValueById('Resolved_Conflicts_Count', contact.conflictingFields.length, {
			returnDocument: 'after',
		});
		if (value) {
			void notifyOnSettingChanged(value);
		}
	}

	const customFields = receivedCustomFields && validateCustomFields(await getAllowedCustomFields(), receivedCustomFields);

	const updatedContact = await LivechatContacts.updateContact(contactId, {
		name,
		emails: emails?.map((address) => ({ address })),
		phones: phones?.map((phoneNumber) => ({ phoneNumber })),
		contactManager,
		channels,
		customFields,
		...(wipeConflicts && { conflictingFields: [] }),
	});

	return updatedContact;
}
