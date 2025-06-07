// store/hooks.ts
import { TypedUseSelectorHook, useSelector } from 'react-redux';
import { RootState } from './index';

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;