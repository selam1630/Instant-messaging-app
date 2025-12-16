/**
 * @format
 */

import { AppRegistry } from 'react-native';
// Provide a runtime shim for modules still importing AsyncStorage from 'react-native'
// This prevents the uncaught error when a library expects `react-native` AsyncStorage.
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const RN = require('react-native');
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const AsyncStorage = require('@react-native-async-storage/async-storage').default;
	if (RN && !RN.AsyncStorage) RN.AsyncStorage = AsyncStorage;
} catch (e) {
	// ignore any errors — app will continue and libraries that correctly import the package will work
}

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
