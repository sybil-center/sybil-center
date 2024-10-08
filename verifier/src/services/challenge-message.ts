type FromMessage = {
  nonce: string;
  message: string;
  verifierURL: string;
  description: string;
}


export const ChallengeMessage = {
  toMessage: (args: {
    verifierURL: string;
    nonce: string;
  }) => {
    const verifierURL = new URL(args.verifierURL);
    const nonce = args.nonce;
    return (
      "If you sign this message, you consent to the partial " +
      "or complete disclosure of your digital attributes. " +
      "Before signing this message, ensure that you are informed " +
      `about what information the ${verifierURL.hostname} will see.` +
      "\n\n" +
      `recipient url: ${verifierURL.origin}` +
      "\n\n" +
      `nonce: ${nonce}`
    );
  },
  fromMessage: (message: string): FromMessage => {
    const [description, recipientLine, nonceLine] = message.split("\n\n");
    if (!description || !recipientLine || !nonceLine) throw new Error(
      `Invalid challenge message`
    );
    const verifierURL = recipientLine.split(": ")[1];
    if (!verifierURL) throw new Error(`Invalid challenge message`);
    const nonce = nonceLine.split(": ")[1];
    if (!nonce) throw new Error(`Invalid challenge message`);
    return {
      message: message,
      description: description,
      nonce: nonce,
      verifierURL: verifierURL
    };
  }
};