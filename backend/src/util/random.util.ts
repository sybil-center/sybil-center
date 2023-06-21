const base64urlChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";


export const random = {
  string: (length: number): string => {
    return [...Array(length).keys()].reduce((result) => {
      result += base64urlChars.charAt(Math.floor(Math.random() * base64urlChars.length));
      return result;
    }, "");
  }
};
