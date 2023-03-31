import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { validateVC } from "../../service/vc-validator/validate";

export function VCValidator() {

  const [strVC, setStrVC] = useState('');
  const [isValid, setIsValid] = useState(false);

  const titleBackground = (): string => {
    if (strVC.length === 0) { return '#668bef'; }
    if (isValid) { return '#58fc87'; }
    return '#CC4141';
  };

  const cls = useStyle({ theme: { backgroundColor: titleBackground() } });

  const titleText = () => {
    if (strVC.length === 0) {
      return 'Put your verifiable credential';
    }
    if (isValid) {
      return 'VALID';
    }
    return 'NOT VALID';
  };

  async function handleChanges(inputtedVC: string) {
    setStrVC(inputtedVC)
    const isValid = await validateVC(inputtedVC);
    setIsValid(isValid);
  }

  return (
    <div className={ cls.vcValidator }>
      <div className={ cls.vcValidator__title }>
        { titleText() }
      </div>
      <div className={ cls.vcValidator__textareaWrap }>

        <textarea className={ cls.vcValidator__textarea }
                  onChange={ e => handleChanges(e.target.value) }/>

      </div>
    </div>
  );
}

interface VCValidatorTheme {
  backgroundColor: string,
}

const useStyle = createUseStyles(({ backgroundColor }: VCValidatorTheme) => ({
  vcValidator: {
    borderRadius: '25px',
    boxShadow: '0px 0px 5px white',
    background: `linear-gradient(180deg, ${ backgroundColor } , white 500%)`, //#3D529C - blue
    maxWidth: '500px',
    width: '50%',
    minWidth: '300px',
    color: '#E6E6E6',
    textShadow: '#515151 0px 0px 5px',
  },

  vcValidator__title: {
    padding: '7px 0px 7px 0px'
  },

  vcValidator__textareaWrap: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0px'
  },

  vcValidator__textarea: {
    borderRadius: '25px',
    boxShadow: '0px 0px 2px grey',
    background: '#282c34',
    color: 'ghostwhite',
    maxWidth: '500px',
    width: '100%',
    height: '50px',
    margin: '0px',
    padding: '14px 0px',
    resize: 'none',
    overflow: 'hidden',
    '&:focus': {
      outline: 'none',
    },
    '&:hover': {
      resize: 'vertical',
      overflow: 'visible'
    }
  },
}));
