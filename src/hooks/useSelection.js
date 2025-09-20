import { useContext } from 'react';

import { SelectionContext } from '../context/SelectionContext';

export const useSelection = () => useContext(SelectionContext);
