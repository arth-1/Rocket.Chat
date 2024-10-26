import { mockAppRoot } from '@rocket.chat/mock-providers';
import { render, screen } from '@testing-library/react';
import React from 'react';

import UnsupportedEmptyState from './UnsupportedEmptyState';
import { MarketplaceContext } from '../../../contexts/MarketplaceContext';
import { asyncState } from '../../../lib/asyncState';

describe('with private apps enabled', () => {
	const appRoot = mockAppRoot()
		.withTranslations('en', 'core', {
			Marketplace_unavailable: 'Marketplace unavailable',
		})
		.wrap((children) => (
			<MarketplaceContext.Provider
				value={{
					installedApps: asyncState.resolved({ apps: [] }),
					marketplaceApps: asyncState.rejected(new Error('unsupported version')),
					privateApps: asyncState.resolved({ apps: [] }),
					privateAppsEnabled: true,
					reload: () => Promise.resolve(),
					orchestrator: undefined,
				}}
			>
				{children}
			</MarketplaceContext.Provider>
		));

	it('should inform that the marketplace is unavailable due unsupported version', () => {
		render(<UnsupportedEmptyState />, { wrapper: appRoot.build(), legacyRoot: true });

		expect(screen.getByRole('heading', { name: 'Marketplace unavailable' })).toBeInTheDocument();
	});
});
