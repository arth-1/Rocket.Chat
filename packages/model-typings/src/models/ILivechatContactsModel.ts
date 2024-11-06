import type { AtLeast, ILivechatContact, ILivechatContactChannel, ILivechatVisitor } from '@rocket.chat/core-typings';
import type { AggregationCursor, Document, FindCursor, FindOptions, UpdateResult } from 'mongodb';

import type { FindPaginated, IBaseModel, InsertionModel } from './IBaseModel';

export interface ILivechatContactsModel extends IBaseModel<ILivechatContact> {
	insertContact(
		data: InsertionModel<Omit<ILivechatContact, 'createdAt'>> & { createdAt?: ILivechatContact['createdAt'] },
	): Promise<ILivechatContact['_id']>;
	upsertContact(contactId: string, data: Partial<ILivechatContact>): Promise<ILivechatContact | null>;
	updateContact(contactId: string, data: Partial<ILivechatContact>): Promise<ILivechatContact>;
	addChannel(contactId: string, channel: ILivechatContactChannel): Promise<void>;
	findPaginatedContacts(
		search: { searchText?: string; unknown?: boolean },
		options?: FindOptions<ILivechatContact>,
	): FindPaginated<FindCursor<ILivechatContact>>;
	updateLastChatById(contactId: string, visitorId: string, lastChat: ILivechatContact['lastChat']): Promise<UpdateResult>;
	findContactMatchingVisitor(visitor: AtLeast<ILivechatVisitor, 'visitorEmails' | 'phone'>): Promise<ILivechatContact | null>;
	findOneByVisitorId<T extends Document = ILivechatContact>(
		visitorId: ILivechatVisitor['_id'],
		options?: FindOptions<ILivechatContact>,
	): Promise<T | null>;
	isChannelBlocked(visitorId: ILivechatVisitor['_id']): Promise<boolean>;
	updateContactChannel(
		visitorId: ILivechatVisitor['_id'],
		data: Partial<ILivechatContactChannel>,
		contactData?: Partial<Omit<ILivechatContact, 'channels'>>,
	): Promise<UpdateResult>;
	findSimilarVerifiedContacts(
		channel: Pick<ILivechatContactChannel, 'field' | 'value'>,
		originalContactId: string,
		options?: FindOptions<ILivechatContact>,
	): Promise<ILivechatContact[]>;
	findAverageAmountOfChannels(): AggregationCursor<{ avgChannelsPerContact: number }>;
}
