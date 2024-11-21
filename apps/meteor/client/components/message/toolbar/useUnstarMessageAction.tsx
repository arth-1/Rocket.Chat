import { useSetting, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useEffect } from 'react';

import { MessageAction } from '../../../../app/ui-utils/client/lib/MessageAction';
import { sdk } from '../../../../app/utils/client/lib/SDKClient';
import { queryClient } from '../../../lib/queryClient';

export const useUnstarMessageAction = () => {
	const dispatchToastMessage = useToastMessageDispatch();

	const allowStaring = useSetting('Message_AllowStarring');

	useEffect(() => {
		MessageAction.addButton({
			id: 'unstar-message',
			icon: 'star',
			label: 'Unstar_Message',
			type: 'interaction',
			context: ['starred', 'message', 'message-mobile', 'threads', 'federated', 'videoconf', 'videoconf-threads'],
			async action(_, { message }) {
				try {
					await sdk.call('starMessage', { ...message, starred: false });
					queryClient.invalidateQueries(['rooms', message.rid, 'starred-messages']);
				} catch (error) {
					dispatchToastMessage({ type: 'error', message: error });
				}
			},
			condition({ message, subscription, user }) {
				if (subscription == null && allowStaring) {
					return false;
				}

				return Boolean(message.starred?.find((star: any) => star._id === user?._id));
			},
			order: 3,
			group: 'menu',
		});

		return () => {
			MessageAction.removeButton('unstar-message');
		};
	}, [allowStaring, dispatchToastMessage]);
};
