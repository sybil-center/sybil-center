import { Credential } from "@sybil-center/sdk";
import { createUseStyles } from "react-jss";

interface ShowVCProps {
  vc: Credential,
}

export function ShowVC({ vc }: ShowVCProps) {
  const cls = useStyles()
  return (
    <div className={ cls.showVC }>
      <pre>
        { JSON.stringify(vcForShow(vc), null, 2) }
      </pre>
    </div>
  );
}

function vcForShow(vc: Credential): Credential {
  const deepCopy: Credential = JSON.parse(JSON.stringify(vc));
  deepCopy.proof!.jws = '...';
  deepCopy.proof!.verificationMethod = '...';
  return deepCopy;
}

const useStyles = createUseStyles({
  showVC: {
    border: 'solid grey 1px',
    borderRadius: '10px',
    textAlign: 'justify',
    boxShadow: '0px 0px 5px grey',
    fontWeight: '500',
    fontSize: '13px',
    padding: '2px',
    '&:hover': {
      boxShadow: '0px 0px 5px white'
    },
    color: 'ghostwhite'
  }
})
