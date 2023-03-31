import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type IssuerType =
  | "ETH_ACCOUNT_OWNERSHIP"
  | "TWITTER_ACCOUNT_OWNERSHIP"
  | "GIT_HUB_ACCOUNT_OWNERSHIP"
  | "DISCORD_ACCOUNT_OWNERSHIP";

interface IssuerState {
  currentIssuer: IssuerType;
}

interface IssuerAction {
  issuer: IssuerType;
}

const initial: IssuerState = { currentIssuer: "ETH_ACCOUNT_OWNERSHIP" };

const issuerSlice = createSlice({
  name: "issuer",
  initialState: initial,
  reducers: {
    changeIssuer(state, action: PayloadAction<IssuerAction>) {
      state.currentIssuer = action.payload.issuer;
    },
  },
});

export const { changeIssuer } = issuerSlice.actions;
export default issuerSlice.reducer;
