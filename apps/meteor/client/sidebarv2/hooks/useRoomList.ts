import type { ILivechatInquiryRecord, IRoom, ISubscription } from '@rocket.chat/core-typings';
import { useDebouncedState, useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { TranslationKey, SubscriptionWithRoom } from '@rocket.chat/ui-contexts';
import { useUserPreference, useUserSubscriptions, useSetting } from '@rocket.chat/ui-contexts';
import { useEffect } from 'react';

import { useVideoConfIncomingCalls } from '../../contexts/VideoConfContext';
import { useOmnichannelEnabled } from '../../hooks/omnichannel/useOmnichannelEnabled';
import { useQueuedInquiries } from '../../hooks/omnichannel/useQueuedInquiries';
import { useQueryOptions } from './useQueryOptions';

const query = { open: { $ne: false } };

const emptyQueue: ILivechatInquiryRecord[] = [];

const order: (
	| 'Incoming_Calls'
	| 'Incoming_Livechats'
	| 'Open_Livechats'
	| 'On_Hold_Chats'
	| 'Unread'
	| 'Favorites'
	| 'Teams'
	| 'Discussions'
	| 'Channels'
	| 'Direct_Messages'
	| 'Conversations'
)[] = [
	'Incoming_Calls',
	'Incoming_Livechats',
	'Open_Livechats',
	'On_Hold_Chats',
	'Unread',
	'Favorites',
	'Teams',
	'Discussions',
	'Channels',
	'Direct_Messages',
	'Conversations',
];

const CATEGORIES = {
	Incoming_Calls: 'Incoming_Calls',
	Incoming_Livechats: 'Incoming_Livechats',
	Open_Livechats: 'Open_Livechats',
	On_Hold_Chats: 'On_Hold_Chats',
	Unread: 'Unread',
	Favorites: 'Favorites',
	Teams: 'Teams',
	Discussions: 'Discussions',
	Channels: 'Channels',
	Direct_Messages: 'Direct_Messages',
	Conversations: 'Conversations',
};

const getGroupsCount = (rooms: Array<ISubscription & IRoom>) => {
	return rooms
		.reduce((acc, item, index) => {
			if (typeof item === 'string') {
				acc.push(index);
			}
			return acc;
		}, [] as number[])
		.map((item, index, arr) => (arr[index + 1] ? arr[index + 1] : rooms.length) - item - 1);
};

export const useRoomList = (): {
	flatList: Array<ISubscription & IRoom>;
	roomList: Array<ISubscription & IRoom>;
	groupsCount: number[];
	groupsList: TranslationKey[];
	handleCollapsedGroups: (groupTitle: string) => void;
	collapsedGroups: string[];
} => {
	const [collapsedGroupsStorage, setCollapsedGroupsStorage] = useLocalStorage<string[]>('sidebarGroups', []);

	const [flatRoomList, setFlatRoomList] = useDebouncedState<(ISubscription & IRoom)[]>([], 150);
	const [groupsCount, setGroupsCount] = useDebouncedState<number[]>([0], 150);
	const [collapsedGroups, setCollapsedGroups] = useDebouncedState<string[]>(collapsedGroupsStorage, 150);

	const showOmnichannel = useOmnichannelEnabled();
	const sidebarGroupByType = useUserPreference('sidebarGroupByType');
	const favoritesEnabled = useUserPreference('sidebarShowFavorites');
	const sidebarOrder = useUserPreference<typeof order>('sidebarSectionsOrder') ?? order;
	const isDiscussionEnabled = useSetting('Discussion_enabled');
	const sidebarShowUnread = useUserPreference('sidebarShowUnread');

	const options = useQueryOptions();

	const rooms = useUserSubscriptions(query, options);

	const inquiries = useQueuedInquiries();

	const incomingCalls = useVideoConfIncomingCalls();

	let queue = emptyQueue;
	if (inquiries.enabled) {
		queue = inquiries.queue;
	}

	const shouldAddUnread = (room: SubscriptionWithRoom) =>
		!(sidebarShowUnread && isCollapsed(CATEGORIES.Unread) && (room.alert || room.unread));
	const isCollapsed = (groupTitle: string) => collapsedGroups.includes(groupTitle);

	useEffect(() => {
		// eslint-disable-next-line complexity
		setFlatRoomList(() => {
			const incomingCall = new Set();
			const favorite = new Set();
			const team = new Set();
			const omnichannel = new Set();
			const unread = new Set();
			const channels = new Set();
			const direct = new Set();
			const discussion = new Set();
			const conversation = new Set();
			const onHold = new Set();

			// eslint-disable-next-line complexity
			rooms.forEach((room) => {
				if (room.archived) {
					return;
				}

				if (incomingCalls.find((call) => call.rid === room.rid) && !isCollapsed(CATEGORIES.Incoming_Calls)) {
					return incomingCall.add(room);
				}

				if (sidebarShowUnread && !isCollapsed(CATEGORIES.Unread) && (room.alert || room.unread)) {
					return unread.add(room);
				}

				if (favoritesEnabled && room.f && !isCollapsed(CATEGORIES.Favorites) && shouldAddUnread(room)) {
					return favorite.add(room);
				}

				if (sidebarGroupByType && room.teamMain && !isCollapsed(CATEGORIES.Teams) && shouldAddUnread(room)) {
					return team.add(room);
				}

				if (sidebarGroupByType && isDiscussionEnabled && room.prid && !isCollapsed(CATEGORIES.Discussions) && shouldAddUnread(room)) {
					return discussion.add(room);
				}

				if ((room.t === 'c' || room.t === 'p') && !isCollapsed(CATEGORIES.Channels) && shouldAddUnread(room)) {
					channels.add(room);
				}

				if (room.t === 'l' && room.onHold && !isCollapsed(CATEGORIES.On_Hold_Chats) && shouldAddUnread(room)) {
					return showOmnichannel && onHold.add(room);
				}

				if (room.t === 'l' && !isCollapsed(CATEGORIES.Open_Livechats) && shouldAddUnread(room)) {
					return showOmnichannel && omnichannel.add(room);
				}

				if (room.t === 'd' && !isCollapsed(CATEGORIES.Direct_Messages) && shouldAddUnread(room)) {
					direct.add(room);
				}

				if (!isCollapsed(CATEGORIES.Conversations) && shouldAddUnread(room)) {
					conversation.add(room);
				}
			});

			const groups = new Map();
			incomingCall.size && groups.set('Incoming_Calls', incomingCall);
			showOmnichannel &&
				inquiries.enabled &&
				(queue.length || isCollapsed(CATEGORIES.Incoming_Livechats)) &&
				groups.set('Incoming_Livechats', queue);
			showOmnichannel && (omnichannel.size || isCollapsed(CATEGORIES.Open_Livechats)) && groups.set('Open_Livechats', omnichannel);
			showOmnichannel && (onHold.size || isCollapsed(CATEGORIES.On_Hold_Chats)) && groups.set('On_Hold_Chats', onHold);
			sidebarShowUnread && (unread.size || isCollapsed(CATEGORIES.Unread)) && groups.set('Unread', unread);
			favoritesEnabled && (favorite.size || isCollapsed(CATEGORIES.Favorites)) && groups.set('Favorites', favorite);
			sidebarGroupByType && (team.size || isCollapsed(CATEGORIES.Teams)) && groups.set('Teams', team);
			sidebarGroupByType &&
				isDiscussionEnabled &&
				(discussion.size || isCollapsed(CATEGORIES.Discussions)) &&
				groups.set('Discussions', discussion);
			sidebarGroupByType && (channels.size || isCollapsed(CATEGORIES.Channels)) && groups.set('Channels', channels);
			sidebarGroupByType && (direct.size || isCollapsed(CATEGORIES.Direct_Messages)) && groups.set('Direct_Messages', direct);
			!sidebarGroupByType && groups.set('Conversations', conversation);
			const flatList = sidebarOrder
				.map((key) => {
					const group = groups.get(key);
					if (!group) {
						return [];
					}

					return [key, ...group];
				})
				.flat();

			setGroupsCount(getGroupsCount([...flatList]));
			return flatList;
		});
	}, [
		rooms,
		showOmnichannel,
		incomingCalls,
		inquiries.enabled,
		queue,
		sidebarShowUnread,
		favoritesEnabled,
		sidebarGroupByType,
		setFlatRoomList,
		isDiscussionEnabled,
		sidebarOrder,
		setGroupsCount,
		collapsedGroups,
	]);

	const handleCollapsedGroups = (group: string) => {
		if (collapsedGroups.includes(group)) {
			setCollapsedGroups(collapsedGroups.filter((item) => item !== group));
			setCollapsedGroupsStorage(collapsedGroups.filter((item) => item !== group));
		} else {
			setCollapsedGroups([...collapsedGroups, group]);
			setCollapsedGroupsStorage([...collapsedGroups, group]);
		}
	};

	const groupsList = flatRoomList.filter((item) => typeof item === 'string');
	const roomList = flatRoomList.filter((item) => typeof item !== 'string');

	return {
		flatList: flatRoomList,
		roomList,
		groupsCount,
		groupsList,
		handleCollapsedGroups,
		collapsedGroups,
	};
};
