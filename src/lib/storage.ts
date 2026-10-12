import * as SecureStore from 'expo-secure-store';

/**
 * Native only: the device's encrypted keychain/keystore. Entries stay on this device
 * (not copied into backups). On web there is no token storage at all — the refresh
 * token lives in an httpOnly cookie the page can't read.
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  get: (key: string) => SecureStore.getItemAsync(key, options),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value, options),
  remove: (key: string) => SecureStore.deleteItemAsync(key, options),
};
