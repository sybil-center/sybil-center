import React from "react";
import { createUseStyles } from "react-jss";
import { ButtonVCIssuer } from "./ButtonVCIssuer";
import { useAppDispatch } from "../../hooks/app-redux";
import { changeIssuer } from "../../store/issuerSlice";

interface TitledContainerProps {
  title: string;
}

export function Sidebar({ title }: TitledContainerProps) {

  const dispatch = useAppDispatch();

  const cls = useStyles();

  return (
    <div className={ cls.titleContainer }>
      <div className={ cls.titleContainer__titleWrap }>
        <div className={ cls.titleContainer__title }>
          { title }
        </div>
      </div>

      <div className={ cls.titleContainer__contentWrap }>
        <div className={ cls.titleContainer__content }>
          <ButtonVCIssuer serviceTitle={ 'Ethereum' }
                          logo={ process.env.PUBLIC_URL + '/logo/service/ETH-logo.png' }
                          theme={ { backgroundColor: '#7F78CD' } }
                          onClick={ () => dispatch(changeIssuer({ issuer: "ETH_ACCOUNT_OWNERSHIP" })) }>
            Account ownership
          </ButtonVCIssuer>
          <ButtonVCIssuer serviceTitle={ 'Twitter' }
                          logo={ process.env.PUBLIC_URL + '/logo/service/Twitter-logo.png' }
                          theme={ { backgroundColor: '#49abda' } }
                          onClick={ () => dispatch(changeIssuer({ issuer: "TWITTER_ACCOUNT_OWNERSHIP" })) }>
            Account ownership
          </ButtonVCIssuer>
          <ButtonVCIssuer serviceTitle={ 'GitHub' }
                          logo={ process.env.PUBLIC_URL + '/logo/service/GitHub-logo.png' }
                          theme={ { backgroundColor: '#000000' } }
                          onClick={ () => dispatch(changeIssuer({ issuer: "GIT_HUB_ACCOUNT_OWNERSHIP" })) }>
            Account ownership
          </ButtonVCIssuer>
          <ButtonVCIssuer serviceTitle={ 'Discord' }
                          logo={ process.env.PUBLIC_URL + '/logo/service/Discord-logo.png' }
                          theme={ { backgroundColor: '#5476da' } }
                          onClick={ () => dispatch(changeIssuer({ issuer: "DISCORD_ACCOUNT_OWNERSHIP" })) }>
            Account ownership
          </ButtonVCIssuer>
        </div>
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  titleContainer: {
    height: '100vh',
    minHeight: '1000px',
    background: 'linear-gradient(180deg, #222730, black 150%)',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0px 10px'
  },

  titleContainer__titleWrap: {
    padding: '17px 0px'
  },

  titleContainer__title: {
    color: '#E6E6E6',
    textShadow: '#7E7E7E 0px 0px 5px',
    fontSize: '25px'
  },

  titleContainer__contentWrap: {
    display: 'flex',
    justifyContent: 'center'
  },

  titleContainer__content: {
    boxShadow: '0px 0px 3px white',
    background: '#DFDFDF',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
    width: '50vw',
    maxWidth: '600px',
    borderRadius: '15px',
    padding: '10px 20px',
    gap: '12px'
  }
});
