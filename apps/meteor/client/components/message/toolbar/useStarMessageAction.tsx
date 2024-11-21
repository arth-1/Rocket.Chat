import type { IRoom } from '@rocket.chat/core-typings';
import { isOmnichannelRoom } from '@rocket.chat/core-typings';
import { useSetting, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useEffect } from 'react';

import { MessageAction } from '../../../../app/ui-utils/client/lib/MessageAction';
import { sdk } from '../../../../app/utils/client/lib/SDKClient';
import { queryClient } from '../../../lib/queryClient';

export const useStarMessageAction = (room: IRoom) => {
	const dispatchToastMessage = useToastMessageDispatch();

	const allowStarring = useSetting('Message_AllowStarring');

	useEffect(() => {
		if (!allowStarring || isOmnichannelRoom(room)) {
			return () => {
				MessageAction.removeButton('star-message');
			};
		}

		MessageAction.addButton({
			id: 'star-message',
			icon: 'star',
			label: 'Star',
			type: 'interaction',
			context: ['starred', 'message', 'message-mobile', 'threads', 'federated', 'videoconf', 'videoconf-threads'],
			async action(_, { message }) {
				try {
					await sdk.call('starMessage', { ...message, starred: true });
					queryClient.invalidateQueries(['rooms', message.rid, 'starred-messages']);
				} catch (error) {
					if (error) {
						dispatchToastMessage({ type: 'error', message: error });
					}
				}
			},
			condition({ message, user }) {
				return !Array.isArray(message.starred) || !message.starred.find((star: any) => star._id === user?._id);
			},
			order: 3,
			group: 'menu',
		});

		return () => {
			MessageAction.removeButton('star-message');
		};
	}, [allowStarring, dispatchToastMessage, room]);
};
