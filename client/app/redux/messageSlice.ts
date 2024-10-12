// import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// interface IMessage {
//     text: string;
//     name: string;
//     id: string;
//     socketId: string;
//     roomId: string;
//     image?: string;
// }

// interface MessagesState {
//   messages: { [key: string]: IMessage[] };
// }

// const initialState: MessagesState = {
//   messages: {},
// };

// const messagesSlice = createSlice({
//   name: 'messages',
//   initialState,
//   reducers: {
//     addMessage: (state, action: PayloadAction<IMessage>) => {
//       const { roomId, ...message } = action.payload;
//       state.messages[roomId] = [...(state.messages[roomId] ?? []), message];
//     },
    
//   },
// });

// export const { addMessage } = messagesSlice.actions;
// export default messagesSlice.reducer;