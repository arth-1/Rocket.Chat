import { useSetting, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useEffect } from 'react';

import { MessageAction } from '../../../../app/ui-utils/client/lib/MessageAction';
import { sdk } from '../../../../app/utils/client/lib/SDKClient';
import { queryClient } from '../../../lib/queryClient';
import { roomCoordinator } from '../../../lib/rooms/roomCoordinator';

export const useStarMessageAction = () => {
	const dispatchToastMessage = useToastMessageDispatch();

	const allowStaring = useSetting('Message_AllowStarring');

	useEffect(() => {
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
			condition({ message, subscription, user, room }) {
				if (subscription == null && allowStaring) {
					return false;
				}
				const isLivechatRoom = roomCoordinator.isLivechatRoom(room.t);
				if (isLivechatRoom) {
					return false;
				}

				return !Array.isArray(message.starred) || !message.starred.find((star: any) => star._id === user?._id);
			},
			order: 3,
			group: 'menu',
		});

		return () => {
			MessageAction.removeButton('star-message');
		};
	}, [allowStaring, dispatchToastMessage]);
};
