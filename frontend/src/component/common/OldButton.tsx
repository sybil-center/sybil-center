import React from "react";
import { createUseStyles } from "react-jss";

interface ButtonProps {
  theme: ButtonTheme;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
}

export function OldButton({ theme, children, onClick }: ButtonProps) {
  const cls = useStyle({ theme });
  return (
    <div className={ cls.button } onClick={ onClick }>
      <div className={ cls.button__titleContainer }>
        { children }
      </div>
    </div>
  );
}

interface ButtonTheme {
  backgroundColor: string;
}

const useStyle = createUseStyles((theme: ButtonTheme) => ({
  button: {
    fontSize: '20px',
    background: `linear-gradient(180deg, ${ theme.backgroundColor }, white 500%)`,
    borderRadius: '10px',
    borderColor: 'grey',
    maxWidth: '300px',
    width: '40%',
    minWidth: '200px',
    color: '#f5f4f4',
    boxShadow: '0px 0px 5px #E6E6E6',
    padding: '3px 6px',
    transition: 'all 0.3s',

    '&:hover': {
      boxShadow: `0px 0px 10px ${ theme.backgroundColor }`,
      cursor: 'pointer'
    }
  },

  button__titleContainer: {
    color: '#E6E6E6',
    textShadow: 'black 0px 0px 3px',
    fontSize: '25px'
  }
}));
