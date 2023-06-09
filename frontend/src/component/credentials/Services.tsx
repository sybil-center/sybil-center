import { type CredentialKinds } from "@sybil-center/sdk";
import { Dispatch, SetStateAction } from "react";
import { createUseStyles } from "react-jss";
import { greyBG, whiteGreyBG } from "../../styles/colors";
import { middleFont } from "../../styles/fonts";
import { ServiceEntry, ServiceTitle } from "./Credentials";
import { cn } from "../../util/styles";

type ServicesProps = {
  serviceEntry: ServiceEntry;
  setServiceEntry: Dispatch<SetStateAction<ServiceEntry>>;
  services: Service[];
}

export type Service = {
  img: { path: string, alt: string }
  kind: ServiceTitle;
  issuers: { kind: keyof CredentialKinds, text: string }[];
}

export function Services({
  serviceEntry,
  setServiceEntry,
  services,
}: ServicesProps) {
  const cls = useStyle();

  const currentService = serviceEntry.currentService;
  const currentIssuer = serviceEntry.currentIssuer;

  const renderServices = () => {
    return services.map((service, ind) => {
      const isServiceClicked = service.kind === serviceEntry.currentService;
      return (
        <div key={ind}>
          <div className={isServiceClicked ? cn(cls.serviceElement, cls.serviceElement__clicked) : cls.serviceElement}
               onClick={() => {
                 if (currentService === service.kind) setServiceEntry((prev) => (
                   { ...prev, currentService: null }
                 ));
                 else setServiceEntry((prev) => (
                   { ...prev, currentService: service.kind }
                 ));
               }}
          >
            <div className={cls.serviceElementLogo}>
              <img className={cls.serviceElementImg} src={service.img.path} alt={service.img.alt}/>
            </div>
            <div className={cls.serviceElementText}>
              {service.kind}
            </div>
          </div>
          {isServiceClicked && <div className={cls.issuers}>
            {service.issuers.map((issuer, ind) => {
              return (
                <div className={issuer.kind === currentIssuer ? cls.issuerElement__clicked : cls.issuerElement}
                     key={ind}
                     onClick={() => setServiceEntry((prev) => ({ ...prev, currentIssuer: issuer.kind }))}
                >
                  {issuer.text}
                </div>
              );
            })}
          </div>}
        </div>
      );
    });
  };

  return (
    <div className={cls.servicesContainer}>
      <div className={cls.services}>
        {renderServices()}
      </div>
    </div>
  );
}

const useStyle = createUseStyles({
  servicesContainer: {
    height: "560px",
    position: "relative",
    top: "54px",
    left: "50%",
    transform: "translate(-50%)",
    display: "flex",
    alignItems: "center",
    rowGap: "25px",
    flexDirection: "column",
    maxWidth: "370px",
    overflow: "hidden",
    overflowY: "scroll",
  },

  services: {
    padding: "5px 2px",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    rowGap: "25px",
  },

  serviceElement: {
    width: "280px",
    background: whiteGreyBG,
    borderRadius: "5px",
    filter: "drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.25))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    cursor: "pointer"
  },

  serviceElement__clicked: {
    borderRadius: "5px 5px 0 0",
  },

  serviceElementLogo: {
    height: "38px",
    width: "38px",
    padding: "6px 0",
  },
  serviceElementImg: {
    borderRadius: "50%"
  },

  serviceElementText: {
    fontSize: middleFont,
    textAlign: "center",
    minWidth: "150px"
  },

  issuers: {
    maxHeight: "100px",
    overflow: "hidden",
    overflowY: "scroll",
    scrollbarColor: "red green",
    boxShadow: "0px 5px 10px 1px  rgba(0, 0, 0, 0.1)",
    borderRadius: "0px 0px 3px 3px"
  },

  issuerElement: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "34px",
    borderBottom: "1px solid #DDDDDD",
    cursor: "pointer"
  },

  issuerElement__clicked: {
    display: "flex",
    backgroundColor: greyBG,
    justifyContent: "center",
    alignItems: "center",
    height: "34px",
    borderBottom: "1px solid #DDDDDD",
    cursor: "pointer"
  }
});
