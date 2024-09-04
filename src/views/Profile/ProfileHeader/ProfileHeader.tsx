import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactSVG } from 'react-svg';

import { Button } from 'components/atoms/Button';
import { Modal } from 'components/molecules/Modal';
import { Panel } from 'components/molecules/Panel';
import { ProfileManage } from 'components/organisms/ProfileManage';
import { Streaks } from 'components/organisms/Streaks';
import { ASSETS, DEFAULTS, URLS } from 'helpers/config';
import { getTxEndpoint } from 'helpers/endpoints';
import { checkValidAddress, formatAddress } from 'helpers/utils';
import { useArweaveProvider } from 'providers/ArweaveProvider';
import { useLanguageProvider } from 'providers/LanguageProvider';

import * as S from './styles';
import { IProps } from './types';

const MAX_BIO_LENGTH = 80;

export default function ProfileHeader(props: IProps) {
	const navigate = useNavigate();

	const arProvider = useArweaveProvider();

	const languageProvider = useLanguageProvider();
	const language = languageProvider.object[languageProvider.current];

	const [showProfileManage, setShowProfileManage] = React.useState<boolean>(false);
	const [showBio, setShowBio] = React.useState<boolean>(false);

	React.useEffect(() => {
		(async function () {
			await new Promise((r) => setTimeout(r, 100));
			if (props.profile && !props.profile.id) setShowProfileManage(true);
		})();
	}, [props.profile]);

	function getAvatar() {
		if (props.profile && props.profile.avatar && checkValidAddress(props.profile.avatar))
			return <img src={getTxEndpoint(props.profile.avatar)} />;
		return <ReactSVG src={ASSETS.user} />;
	}

	function getHandle() {
		return props.profile.username ? `@${props.profile.username}` : formatAddress(props.profile.walletAddress, false);
	}

	function getHeaderDetails() {
		return props.profile ? (
			<S.HeaderHA>
				<h4>
					{props.profile.displayName ? props.profile.displayName : formatAddress(props.profile.walletAddress, false)}
				</h4>
				<S.HeaderInfoDetail>
					<span>{`${getHandle()}`}</span>
				</S.HeaderInfoDetail>
				{props.profile.bio ? (
					<S.HeaderInfoBio>
						<span>
							{props.profile.bio.length > MAX_BIO_LENGTH
								? props.profile.bio.substring(0, MAX_BIO_LENGTH) + '...'
								: props.profile.bio}
						</span>
						{props.profile.bio.length > MAX_BIO_LENGTH && (
							<button onClick={() => setShowBio(true)}>{language.viewFullBio}</button>
						)}
					</S.HeaderInfoBio>
				) : (
					<S.HeaderInfoBio>
						<span>{language.noBio}</span>
					</S.HeaderInfoBio>
				)}
			</S.HeaderHA>
		) : null;
	}

	return props.profile ? (
		<>
			<S.Wrapper
				backgroundImage={getTxEndpoint(
					props.profile.banner && checkValidAddress(props.profile.banner) ? props.profile.banner : DEFAULTS.banner
				)}
				className={'border-wrapper-alt2 fade-in'}
			>
				<S.OverlayWrapper />
				<S.HeaderWrapper>
					<S.HeaderInfo>
						<S.HeaderAvatar>{getAvatar()}</S.HeaderAvatar>
						{getHeaderDetails()}
					</S.HeaderInfo>
					<S.HeaderActions>
						<S.Action>
							<Streaks profile={props.profile} />
						</S.Action>
						{arProvider.profile && arProvider.profile.id === props.profile.id && (
							<S.Action>
								<Button
									type={'primary'}
									label={language.editProfile}
									handlePress={() => setShowProfileManage(true)}
									className={'fade-in'}
									height={35}
								/>
							</S.Action>
						)}
					</S.HeaderActions>
				</S.HeaderWrapper>
			</S.Wrapper>
			{showProfileManage && arProvider.profile && arProvider.profile.id === props.profile.id && (
				<Panel
					open={showProfileManage}
					header={props.profile.id ? language.editProfile : `${language.createProfile}!`}
					handleClose={props.profile.id ? () => setShowProfileManage(false) : () => navigate(URLS.base)}
				>
					<S.PManageWrapper>
						<ProfileManage
							profile={props.profile}
							handleClose={props.profile.id ? () => setShowProfileManage(false) : null}
							handleUpdate={() => props.handleUpdate()}
						/>
					</S.PManageWrapper>
				</Panel>
			)}
			{showBio && props.profile && props.profile.bio && (
				<Modal header={language.bio} handleClose={() => setShowBio(false)}>
					<div className={'modal-wrapper'}>
						<p>{props.profile.bio}</p>
					</div>
				</Modal>
			)}
		</>
	) : null;
}
