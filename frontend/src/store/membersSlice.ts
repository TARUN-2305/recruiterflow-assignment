import { createSlice } from '@reduxjs/toolkit';
import { sampleTripData } from '../data/sampleData';
import type { Member } from '../domain/types';

export interface MembersState {
  list: Member[];
}

const initialState: MembersState = { list: sampleTripData().members };

// The five trip members are fixed (there is no UI to edit them), so there are no reducers.
const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {},
});

export default membersSlice.reducer;
