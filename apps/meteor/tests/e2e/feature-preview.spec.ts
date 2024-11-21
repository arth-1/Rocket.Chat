import { faker } from '@faker-js/faker';

import { Users } from './fixtures/userStates';
import { AccountProfile, HomeChannel } from './page-objects';
import { createTargetChannel, createTargetTeam, deleteChannel, deleteTeam, setSettingValueById } from './utils';
import { setUserPreferences } from './utils/setUserPreferences';
import { test, expect } from './utils/test';

test.use({ storageState: Users.admin.state });

test.describe.serial('feature preview', () => {
	let poHomeChannel: HomeChannel;
	let poAccountProfile: AccountProfile;
	let targetChannel: string;
	let targetTeam: string;
	const targetChannelNameInTeam = `channel-from-team-${faker.number.int()}`;

	test.beforeAll(async ({ api }) => {
		await setSettingValueById(api, 'Accounts_AllowFeaturePreview', true);
		targetChannel = await createTargetChannel(api);
	});

	test.afterAll(async ({ api }) => {
		await setSettingValueById(api, 'Accounts_AllowFeaturePreview', false);
		await deleteChannel(api, targetChannel);
	});

	test.beforeEach(async ({ page }) => {
		poHomeChannel = new HomeChannel(page);
		poAccountProfile = new AccountProfile(page);
	});

	test('should show "Message" and "Navigation" feature sections', async ({ page }) => {
		await page.goto('/account/feature-preview');

		await expect(page.getByRole('button', { name: 'Message' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Navigation' })).toBeVisible();
	});

	test.describe('Enhanced navigation', () => {
		test.beforeAll(async ({ api }) => {
			await setUserPreferences(api, {
				featuresPreview: [
					{
						name: 'newNavigation',
						value: true,
					},
				],
			});
		});

		test.afterAll(async ({ api }) => {
			await setUserPreferences(api, {
				featuresPreview: [
					{
						name: 'newNavigation',
						value: false,
					},
				],
			});
		});

		// After moving `Enhanced navigation` out of feature preview, move these tests to sidebar.spec.ts
		test('should be able to toggle "Enhanced navigation" feature', async ({ page }) => {
			await page.goto('/account/feature-preview');

			await poAccountProfile.getAccordionItemByName('Navigation').click();
			const newNavigationCheckbox = poAccountProfile.getCheckboxByLabelText('Enhanced navigation');
			await expect(newNavigationCheckbox).toBeChecked();
			await newNavigationCheckbox.click();
			await expect(newNavigationCheckbox).not.toBeChecked();
		});

		test('should be rendering new UI with "Enhanced navigation"', async ({ page }) => {
			await page.goto('/account/feature-preview');

			await expect(poHomeChannel.navbar.navbar).toBeVisible();
		});

		test('should display "Recent" button on sidebar search section, and display recent chats when clicked', async ({ page }) => {
			await page.goto('/home');

			await poHomeChannel.sidebar.btnRecent.click();
			await expect(poHomeChannel.sidebar.sidebar.getByRole('heading', { name: 'Recent' })).toBeVisible();
		});

		test('should expand/collapse sidebar groups', async ({ page }) => {
			await page.goto('/home');
			const collapser = poHomeChannel.sidebar.firstCollapser;
			let isExpanded: boolean;

			await collapser.click();
			isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
			expect(isExpanded).toBeFalsy();

			await collapser.click();
			isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
			expect(isExpanded).toBeTruthy();
		});

		test('should expand/collapse sidebar groups with keyboard', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidebar.firstCollapser;

			await expect(async () => {
				await collapser.focus();
				await expect(collapser).toBeFocused();
				await page.keyboard.press('Enter');
				const isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
				expect(isExpanded).toBeFalsy();
			}).toPass();

			await expect(async () => {
				await collapser.focus();
				await page.keyboard.press('Space');
				const isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
				expect(isExpanded).toBeTruthy();
			}).toPass();
		});

		test('should be able to use keyboard to navigate through sidebar items', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidebar.firstCollapser;
			const dataIndex = await collapser.locator('../..').getAttribute('data-index');
			const nextItem = page.locator(`[data-index="${Number(dataIndex) + 1}"]`).getByRole('link');

			await expect(async () => {
				await collapser.focus();
				await page.keyboard.press('ArrowDown');
				await expect(nextItem).toBeFocused();
			}).toPass();
		});

		test('should persist collapsed/expanded groups after page reload', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidebar.firstCollapser;
			await collapser.click();
			const isExpanded = await collapser.getAttribute('aria-expanded');

			await page.reload();

			const isExpandedAfterReload = await collapser.getAttribute('aria-expanded');
			expect(isExpanded).toEqual(isExpandedAfterReload);
		});

		test('should show unread badge on collapser when group is collapsed and has unread items', async ({ page }) => {
			await page.goto('/home');

			await poHomeChannel.sidebar.openChat(targetChannel);
			await poHomeChannel.content.sendMessage('hello world');

			await poHomeChannel.sidebar.typeSearch(targetChannel);
			const item = poHomeChannel.sidebar.getSearchRoomByName(targetChannel);
			await poHomeChannel.sidebar.markItemAsUnread(item);
			await poHomeChannel.sidebar.escSearch();

			const collapser = poHomeChannel.sidebar.firstCollapser;
			await collapser.click();

			await expect(poHomeChannel.sidebar.getItemUnreadBadge(collapser)).toBeVisible();
		});
	});

	test.describe('Sidepanel', () => {
		test.beforeEach(async ({ api }) => {
			await setUserPreferences(api, {
				sidebarViewMode: 'Condensed',
				featuresPreview: [
					{
						name: 'newNavigation',
						value: true,
					},
					{
						name: 'sidepanelNavigation',
						value: true,
					},
				],
			});
			targetTeam = await createTargetTeam(api);
		});

		test.afterEach(async ({ api }) => {
			await setUserPreferences(api, {
				sidebarViewMode: 'Condensed',
				featuresPreview: [
					{
						name: 'newNavigation',
						value: false,
					},
					{
						name: 'sidepanelNavigation',
						value: false,
					},
				],
			});
			await deleteTeam(api, targetTeam);
		});
		test('should be able to toggle "Sidepanel" feature', async ({ page }) => {
			await page.goto('/account/feature-preview');

			await poAccountProfile.getAccordionItemByName('Navigation').click();
			const sidepanelCheckbox = poAccountProfile.getCheckboxByLabelText('Secondary navigation for teams');
			await expect(sidepanelCheckbox).toBeChecked();
			await sidepanelCheckbox.click();
			await expect(sidepanelCheckbox).not.toBeChecked();

			await poAccountProfile.btnSaveChanges.click();

			await expect(poAccountProfile.btnSaveChanges).not.toBeVisible();
			await expect(sidepanelCheckbox).not.toBeChecked();
		});

		test('should display sidepanel on a team', async ({ page }) => {
			await page.goto('/home');

			await poHomeChannel.sidebar.openChat(targetTeam);

			await poHomeChannel.tabs.btnRoomInfo.click();
			await poHomeChannel.tabs.room.btnEdit.click();
			await poHomeChannel.tabs.room.toggleSidepanelWithChannels();

			await expect(poHomeChannel.sidepanel.sidepanelList).toBeVisible();
		});

		test('should display new channel from team on the sidepanel', async ({ page, api }) => {
			await page.goto('/home');

			await poHomeChannel.sidebar.openChat(targetTeam);

			await poHomeChannel.tabs.btnRoomInfo.click();
			await poHomeChannel.tabs.room.btnEdit.click();
			await poHomeChannel.tabs.room.toggleSidepanelWithChannels();

			await expect(poHomeChannel.toastSuccess).toBeVisible();
			await poHomeChannel.dismissToast();

			await poHomeChannel.tabs.btnChannels.click();
			await poHomeChannel.tabs.channels.btnCreateNew.click();
			await poHomeChannel.sidenav.inputChannelName.fill(targetChannelNameInTeam);
			await poHomeChannel.sidenav.checkboxPrivateChannel.click();
			await poHomeChannel.sidenav.btnCreate.click();

			await expect(poHomeChannel.sidepanel.sidepanelList).toBeVisible();
			await expect(poHomeChannel.sidepanel.getItemByName(targetChannelNameInTeam)).toBeVisible();

			await deleteChannel(api, targetChannelNameInTeam);
		});

		test('should display sidepanel item with the same display preference as the sidebar', async ({ page }) => {
			await page.goto('/home');
			const message = 'hello world';

			await poHomeChannel.sidebar.setDisplayMode('Extended');
			await poHomeChannel.sidebar.openChat(targetTeam);

			await poHomeChannel.tabs.btnRoomInfo.click();
			await poHomeChannel.tabs.room.btnEdit.click();
			await poHomeChannel.tabs.room.toggleSidepanelWithChannels();
			await expect(poHomeChannel.toastSuccess).toBeVisible();
			await poHomeChannel.dismissToast();

			await poHomeChannel.content.sendMessage(message);
			await expect(poHomeChannel.sidepanel.getExtendedItem(targetTeam, message)).toBeVisible();
		});

		// remove .fail after fix
		test.fail('should escape special characters on item subtitle', async ({ page }) => {
			await page.goto('/home');
			const message = 'hello > world';
			const parsedWrong = 'hello &gt; world';

			await poHomeChannel.sidebar.setDisplayMode('Extended');

			await poHomeChannel.sidebar.openChat(targetTeam);

			await poHomeChannel.tabs.btnRoomInfo.click();
			await poHomeChannel.tabs.room.btnEdit.click();
			await poHomeChannel.tabs.room.toggleSidepanelWithChannels();
			await expect(poHomeChannel.toastSuccess).toBeVisible();
			await poHomeChannel.dismissToast();

			await poHomeChannel.content.sendMessage(message);

			await expect(poHomeChannel.sidepanel.getExtendedItem(targetTeam, message)).toBeVisible();
			await expect(poHomeChannel.sidepanel.getExtendedItem(targetTeam, message)).not.toHaveText(parsedWrong);
		});
	});
});
