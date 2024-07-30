import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ReactSVG } from 'react-svg';

import { getRegistryProfiles } from 'api';

import * as GS from 'app/styles';
import { CurrencyLine } from 'components/atoms/CurrencyLine';
import { Modal } from 'components/molecules/Modal';
import { OwnerLine } from 'components/molecules/OwnerLine';
import { Tabs } from 'components/molecules/Tabs';
import { AssetData } from 'components/organisms/AssetData';
import { OrderCancel } from 'components/organisms/OrderCancel';
import { AO, ASSETS, STYLING } from 'helpers/config';
import { getTxEndpoint } from 'helpers/endpoints';
import { ListingType, OwnerType, RegistryProfileType } from 'helpers/types';
import { formatCount, formatPercentage, getOwners, sortOrders } from 'helpers/utils';
import * as windowUtils from 'helpers/window';
import { useArweaveProvider } from 'providers/ArweaveProvider';
import { useLanguageProvider } from 'providers/LanguageProvider';
import { RootState } from 'store';

import { AssetActionActivity } from './AssetActionActivity';
import { AssetActionComments } from './AssetActionComments';
import { AssetActionMarket } from './AssetActionMarket';
import { AssetActionsOwners } from './AssetActionOwners';
import * as S from './styles';
import { IProps } from './types';

export default function AssetAction(props: IProps) {
	const currenciesReducer = useSelector((state: RootState) => state.currenciesReducer);

	const arProvider = useArweaveProvider();

	const languageProvider = useLanguageProvider();
	const language = languageProvider.object[languageProvider.current];

	const ACTION_TAB_OPTIONS = {
		market: language.market,
		owners: language.owners,
		comments: language.comments,
		activity: language.activity,
	};

	const ACTION_TABS = [
		{
			label: ACTION_TAB_OPTIONS.market,
			icon: ASSETS.market,
		},
		{
			label: ACTION_TAB_OPTIONS.activity,
			icon: ASSETS.activity,
		},
		{
			label: ACTION_TAB_OPTIONS.owners,
			icon: ASSETS.users,
		},
	];

	const [mobile, setMobile] = React.useState(!windowUtils.checkWindowCutoff(parseInt(STYLING.cutoffs.secondary)));

	const [totalAssetBalance, setTotalAssetBalance] = React.useState<number>(0);
	const [associatedProfiles, setAssociatedProfiles] = React.useState<RegistryProfileType[] | null>(null);

	const [currentOwners, setCurrentOwners] = React.useState<OwnerType[] | null>(null);
	const [currentListings, setCurrentListings] = React.useState<ListingType[] | null>(null);

	const [showCurrentOwnersModal, setShowCurrentOwnersModal] = React.useState<boolean>(false);
	const [showCurrentListingsModal, setShowCurrentListingsModal] = React.useState<boolean>(false);

	const [currentTab, setCurrentTab] = React.useState<string>(ACTION_TABS[0]!.label);

	React.useEffect(() => {
		if (props.asset && props.asset.state && props.asset.state.balances) {
			const balances: any = Object.keys(props.asset.state.balances).map((address: string) => {
				return Number(props.asset.state.balances[address]);
			});
			const totalBalance = balances.reduce((a: number, b: number) => a + b, 0);
			setTotalAssetBalance(totalBalance);
		}
	}, [props.asset]);

	React.useEffect(() => {
		(async function () {
			if (!associatedProfiles) {
				const associatedAddresses = [];
				if (props.asset && props.asset.state && props.asset.state.balances) {
					associatedAddresses.push(...Object.keys(props.asset.state.balances).map((address: string) => address));
				}
				if (props.asset && props.asset.orders) {
					associatedAddresses.push(...props.asset.orders.map((order: any) => order.creator));
				}
				if (associatedAddresses.length) {
					const uniqueAddresses = [...new Set(associatedAddresses)];
					try {
						const profiles = await getRegistryProfiles({ profileIds: uniqueAddresses });
						setAssociatedProfiles(profiles);
					} catch (e: any) {
						console.error(e);
					}
				}
			}
		})();
	}, [props.asset]);

	React.useEffect(() => {
		(async function () {
			if (props.asset && props.asset.state) {
				let owners = getOwners(props.asset, associatedProfiles);

				if (owners) {
					owners = owners
						.filter((owner: OwnerType) => owner.address !== AO.ucm)
						.filter((owner: OwnerType) => owner.ownerPercentage > 0);
					setCurrentOwners(owners);
				}
			}
			if (props.asset && props.asset.orders) {
				const sortedOrders = sortOrders(props.asset.orders, 'low-to-high');

				const mappedListings = sortedOrders.map((order: any) => {
					let currentProfile = null;
					if (associatedProfiles) {
						currentProfile = associatedProfiles.find((profile: RegistryProfileType) => profile.id === order.creator);
					}

					const currentListing = {
						profile: currentProfile || null,
						...order,
					};

					return currentListing;
				});

				setCurrentListings(mappedListings);
			}
		})();
	}, [props.asset, associatedProfiles]);

	React.useEffect(() => {
		if (currentListings && currentListings.length <= 0) setShowCurrentListingsModal(false);
	}, [currentListings]);

	function handleWindowResize() {
		if (windowUtils.checkWindowCutoff(parseInt(STYLING.cutoffs.secondary))) {
			setMobile(false);
		} else {
			setMobile(true);
		}
	}

	windowUtils.checkWindowResize(handleWindowResize);

	function getDenominatedTokenValue(amount: number, currency: string) {
		if (
			currenciesReducer &&
			currenciesReducer[currency] &&
			currenciesReducer[currency].Denomination &&
			currenciesReducer[currency].Denomination > 1
		) {
			const denomination = currenciesReducer[currency].Denomination;
			return `${formatCount((amount / Math.pow(10, denomination)).toString())}`;
		} else if (
			props.asset &&
			props.asset.state &&
			props.asset.state.denomination &&
			props.asset.state.denomination > 1
		) {
			const denomination = props.asset.state.denomination;
			return `${formatCount((amount / Math.pow(10, denomination)).toString())}`;
		} else return formatCount(amount.toString());
	}

	function getOwnerOrder(listing: ListingType) {
		if (!arProvider.walletAddress) return false;
		if (!arProvider.profile || !arProvider.profile.id) return false;
		return listing.creator === arProvider.profile.id;
	}

	const getCurrentOwners = React.useMemo(() => {
		if (currentOwners) {
			return (
				<>
					{!mobile && (
						<GS.DrawerHeaderWrapper>
							<GS.DrawerContentFlex>
								{language.owner.charAt(0).toUpperCase() + language.owner.slice(1)}
							</GS.DrawerContentFlex>
							<GS.DrawerContentDetail>{language.quantity}</GS.DrawerContentDetail>
							<GS.DrawerContentDetail>{language.percentage}</GS.DrawerContentDetail>
						</GS.DrawerHeaderWrapper>
					)}
					{currentOwners.map((owner: OwnerType, index: number) => {
						return (
							<S.DrawerContentLine key={index}>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>
											{language.owner.charAt(0).toUpperCase() + language.owner.slice(1)}
										</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentFlex>
									<OwnerLine owner={owner} callback={() => setShowCurrentOwnersModal(false)} />
								</S.DrawerContentFlex>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.quantity}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentDetailAlt>
									{getDenominatedTokenValue(owner.ownerQuantity, props.asset.data.id)}
								</S.DrawerContentDetailAlt>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.percentage}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentDetailAlt>{formatPercentage(owner.ownerPercentage)}</S.DrawerContentDetailAlt>
							</S.DrawerContentLine>
						);
					})}
				</>
			);
		} else return null;
	}, [currentOwners, mobile]);

	const getCurrentListings = React.useMemo(() => {
		if (currentListings) {
			return (
				<>
					{!mobile && (
						<GS.DrawerHeaderWrapper>
							<GS.DrawerContentFlex>{language.seller}</GS.DrawerContentFlex>
							<GS.DrawerContentDetail>{language.quantity}</GS.DrawerContentDetail>
							<GS.DrawerContentDetail>{language.percentage}</GS.DrawerContentDetail>
							<GS.DrawerContentDetail>{language.price}</GS.DrawerContentDetail>
						</GS.DrawerHeaderWrapper>
					)}
					{currentListings.map((listing: ListingType, index: number) => {
						return (
							<S.DrawerContentLine key={index}>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.seller}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentFlex>
									<OwnerLine
										owner={{
											address: listing.creator,
											profile: listing.profile,
										}}
										callback={() => setShowCurrentOwnersModal(false)}
									/>
									{getOwnerOrder(listing) && (
										<S.OrderCancel>
											<OrderCancel listing={listing} toggleUpdate={props.toggleUpdate} />
										</S.OrderCancel>
									)}
								</S.DrawerContentFlex>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.quantity}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentDetailAlt>
									{getDenominatedTokenValue(Number(listing.quantity), props.asset.data.id)}
								</S.DrawerContentDetailAlt>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.percentage}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<S.DrawerContentDetailAlt>
									{formatPercentage(Number(listing.quantity) / totalAssetBalance)}
								</S.DrawerContentDetailAlt>
								{mobile && (
									<S.MDrawerHeader>
										<GS.DrawerContentHeader>{language.price}</GS.DrawerContentHeader>
									</S.MDrawerHeader>
								)}
								<GS.DrawerContentFlexEnd>
									<CurrencyLine
										amount={listing.price}
										currency={listing.currency}
										callback={() => setShowCurrentListingsModal(false)}
									/>
								</GS.DrawerContentFlexEnd>
							</S.DrawerContentLine>
						);
					})}
				</>
			);
		} else return null;
	}, [currentListings, showCurrentListingsModal, mobile, arProvider.profile]);

	function getCurrentTab() {
		switch (currentTab) {
			case ACTION_TAB_OPTIONS.market:
				return (
					<AssetActionMarket
						asset={props.asset}
						getCurrentListings={getCurrentListings}
						toggleUpdate={props.toggleUpdate}
					/>
				);
			case ACTION_TAB_OPTIONS.owners:
				return <AssetActionsOwners asset={props.asset} owners={currentOwners} />;
			case ACTION_TAB_OPTIONS.comments:
				return <AssetActionComments asset={props.asset} />;
			case ACTION_TAB_OPTIONS.activity:
				return <AssetActionActivity asset={props.asset} />;
			default:
				return null;
		}
	}

	return props.asset ? (
		<>
			<S.Wrapper>
				<S.DataWrapper>
					<AssetData asset={props.asset} frameMinHeight={550} autoLoad />
				</S.DataWrapper>
				<S.Header>
					<h4>{props.asset.data.title}</h4>
					<S.OwnerLinesWrapper>
						{currentOwners && currentOwners.length > 0 && (
							<S.OwnerLine>
								<span>{language.currentlyOwnedBy}</span>
								<button
									onClick={() => {
										setShowCurrentOwnersModal(true);
									}}
								>{`${formatCount(currentOwners.length.toString())} ${
									currentOwners.length > 1 ? `${language.owner.toLowerCase()}s` : language.owner.toLowerCase()
								}`}</button>
							</S.OwnerLine>
						)}
						{currentListings && currentListings.length > 0 && (
							<S.OwnerLine>
								<span>{language.currentlyBeingSoldBy}</span>
								<button
									onClick={() => {
										setShowCurrentListingsModal(true);
									}}
								>{`${formatCount(currentListings.length.toString())} ${
									currentListings.length > 1 ? `${language.owner.toLowerCase()}s` : language.owner.toLowerCase()
								}`}</button>
							</S.OwnerLine>
						)}
					</S.OwnerLinesWrapper>
					<S.ACActionWrapper>
						<S.ACAction>
							<button onClick={() => props.toggleViewType()}>
								<ReactSVG src={ASSETS.zen} />
								{language.viewInZenMode}
							</button>
						</S.ACAction>
						<S.ACAction>
							<Link target={'_blank'} to={getTxEndpoint(props.asset.data.id)}>
								<ReactSVG src={ASSETS.view} />
								{language.viewOnArweave}
							</Link>
						</S.ACAction>
					</S.ACActionWrapper>
				</S.Header>
				<S.TabsWrapper>
					<Tabs onTabPropClick={(label: string) => setCurrentTab(label)} type={'alt1'}>
						{ACTION_TABS.map((tab: { label: string; icon?: string }, index: number) => {
							return <S.TabWrapper key={index} label={tab.label} icon={tab.icon ? tab.icon : null} />;
						})}
					</Tabs>
					<S.TabContent>{getCurrentTab()}</S.TabContent>
				</S.TabsWrapper>
			</S.Wrapper>
			{showCurrentOwnersModal && currentOwners && currentOwners.length > 0 && (
				<Modal header={language.currentlyOwnedBy} handleClose={() => setShowCurrentOwnersModal(false)}>
					<S.DrawerContent transparent className={'modal-wrapper'}>
						{getCurrentOwners}
					</S.DrawerContent>
				</Modal>
			)}
			{showCurrentListingsModal && currentListings && currentListings.length > 0 && (
				<Modal header={language.currentlyBeingSoldBy} handleClose={() => setShowCurrentListingsModal(false)}>
					<S.DrawerContent className={'modal-wrapper'}>{getCurrentListings}</S.DrawerContent>
				</Modal>
			)}
		</>
	) : null;
}
