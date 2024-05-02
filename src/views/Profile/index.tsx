import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getProfileById } from 'api';

import { Loader } from 'components/atoms/Loader';
import { URLTabs } from 'components/molecules/URLTabs';
import { URLS } from 'helpers/config';
import { ProfileHeaderType } from 'helpers/types';
import { checkValidAddress } from 'helpers/utils';
import { useArweaveProvider } from 'providers/ArweaveProvider';
import { useLanguageProvider } from 'providers/LanguageProvider';

// import { ProfileActivity } from './ProfileActivity';
import { ProfileAssets } from './ProfileAssets';
import { ProfileCollections } from './ProfileCollections';
import { ProfileHeader } from './ProfileHeader';
// import { ProfileListings } from './ProfileListings';

export default function Profile() {
	const navigate = useNavigate();
	const { address, active } = useParams();

	const arProvider = useArweaveProvider();

	const languageProvider = useLanguageProvider();
	const language = languageProvider.object[languageProvider.current];

	const [profile, setProfile] = React.useState<ProfileHeaderType | null>(null);
	const [toggleUpdate, setToggleUpdate] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (!address && !active) navigate(URLS.notFound);
		if (address && !active) navigate(URLS.profileAssets(address));
	}, [address, active]);

	React.useEffect(() => {
		(async function () {
			if (address && checkValidAddress(address)) {
				if (arProvider.profile && arProvider.profile.id && arProvider.profile.id === address) {
					setProfile(arProvider.profile);
				} else {
					try {
						const fetchedProfile = await getProfileById({ profileId: address });
						setProfile(fetchedProfile);
					} catch (e: any) {
						console.error(e);
					}
				}
			} else {
				navigate(URLS.notFound);
			}
		})();
	}, [address, arProvider]);

	const TABS = [
		{
			label: language.assets,
			icon: null,
			disabled: false,
			url: URLS.profileAssets(address),
			view: () => <ProfileAssets address={address} />,
		},
		{
			label: language.collections,
			icon: null,
			disabled: false,
			url: URLS.profileCollections(address),
			view: () => <ProfileCollections address={address} />,
		},
		// {
		// 	label: language.listings,
		// 	icon: null,
		// 	disabled: false,
		// 	url: URLS.profileListings(address),
		// 	view: () => <ProfileListings address={address} />
		// },
		// {
		// 	label: language.activity,
		// 	icon: null,
		// 	disabled: false,
		// 	url: URLS.profileActivity(address),
		// 	view: () => <ProfileActivity address={address} />
		// },
	];

	const urlTabs = React.useMemo(() => {
		return <URLTabs tabs={TABS} activeUrl={TABS[0]!.url} />;
	}, [address]);

	return profile ? (
		<>
			<ProfileHeader profile={profile} handleUpdate={() => setToggleUpdate(!toggleUpdate)} />
			{urlTabs}
		</>
	) : (
		<Loader />
	);
}
