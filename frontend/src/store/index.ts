import { configureStore } from "@reduxjs/toolkit";
import issuerReducer from "./issuerSlice";

const store = configureStore({
  reducer: {
    issuer: issuerReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
