/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

jest.mock('@env', () => ({
  NAVER_CLIENT_ID: 'test-client-id',
  NAVER_CLIENT_SECRET: 'test-client-secret',
}), {virtual: true});

jest.mock('@react-native-seoul/naver-login', () => ({
  initialize: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('../src/navigation', () => {
  const MockNavigator = () => null;
  return MockNavigator;
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
