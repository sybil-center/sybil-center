import { createUseStyles } from "react-jss";
import React, { useState } from "react";
import { OldButton } from "./OldButton";
import { VCValidator } from "./VCValidator";

interface ContentProps {
  children: React.ReactNode;
}

export function Content({ children }: ContentProps) {

  const cls = useStyles();

  const [isValidateClicked, setIsValidateClicked] = useState(false);


  return (
    <div className={ cls.content }>

      <div className={ cls.content__container }>
        <div className={ cls.content__containerIssuer }>
          { children }
        </div>

        <div className={ cls.content__validatorContainer }>
          <OldButton theme={ { backgroundColor: isValidateClicked ? '#C166EFFF' : '#668bef' } }
                     onClick={ () => setIsValidateClicked(prev => !prev) }>
            { isValidateClicked ? 'hide validator' : 'validate vc' }
          </OldButton>

          { isValidateClicked && <VCValidator/> }
        </div>
      </div>

    </div>
  );
}

const useStyles = createUseStyles({

  content: {
    minHeight: '1000px',
    height: '100vh',
    background: 'linear-gradient(180deg, #222730, black 150%)',
    justifyContent: 'center',
    textAlign: 'center',
  },

  content__container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: '30px',
    top: '70px',
    position: 'relative'
  },

  content__containerIssuer: {
    boxShadow: '0px 0px 3px white',
    background: '#282c34',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
    width: '80%',
    maxWidth: '600px',
    borderRadius: '15px',
    padding: '0px 20px 10px 20px',
    gap: '12px',
  },

  content__validatorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '1000px',
    width: '99%',
    minWidth: '300px'
  }
});
