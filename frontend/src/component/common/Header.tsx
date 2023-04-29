import { createUseStyles } from "react-jss";
import React from "react";

interface HeaderProps {
  title: string;
  logo: string;
  theme: HeaderTheme;
  children?: React.ReactNode;
}

export function Header({ title, logo, theme, children }: HeaderProps) {

  const cls = useStyles({ theme });

  return (
    <header className={ cls.header }>
      <div className={ cls.header__container }>

        <div className={ cls.header__logoContainer }>
          <img className={ cls.header__logo } src={ logo } alt={ 'header logo' }/>
        </div>

        <div className={ cls.header__title }>
          { title }
        </div>

        { children &&
          <div className={ cls.header__navigation }>
            { children }
          </div>
        }

      </div>
    </header>
  );
}

interface HeaderTheme {
  backgroundColor: string;
}

const useStyles = createUseStyles((theme: HeaderTheme) => ({
  header: {
    height: '55px',
    background: `linear-gradient(180deg, ${ theme.backgroundColor }, black 200%)`,
    justifyContent: 'center',
    display: 'flex',
    fontFamily: 'sans-serif',
    color: '#E6E6E6',
    textShadow: '#7E7E7E 0px 0px 5px',
  },

  header__container: {
    display: 'flex',
    maxWidth: '1300px',
    width: '80%',
    minWidth: '300px',
    alignItems: 'center',
  },

  header__logoContainer: {
    padding: '3px 5px 0px 5px',
  },

  header__logo: {
    height: '45px',
    left: '50%',
    width: '45px',
    transition: 'all 0.2s',
    '&:hover': {
      boxShadow: `0px 0px 6px ${ theme.backgroundColor }`
    }
  },

  header__title: {
    fontSize: '26px',
    padding: '0px 7px'
  },

  header__navigation: {
    display: 'flex',
    padding: {
      right: '3px'
    },
    flexGrow: 1,
    gap: '20px',
    justifyContent: 'flex-end'
  },

}));
