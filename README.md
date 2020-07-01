# 3step wallet

3step wallet is a wallet for slightly mentally disabled person.
This wallet using [Symbol blockchain](https://nemtech.github.io/).

## Requirements

- node.js v12
- ionic5 + angular9

## Symbol blockchain

- This app using Symbol Testnet(v0.9.4.1)
- Before using this app, create multisig account by [symbol desktop wallet](https://github.com/nemfoundation/symbol-desktop-wallet) or [symbol-cli](https://github.com/nemtech/symbol-cli).

## How to run

### prepare

```
% npm install
% node patch.js
```

### For iOS (live reload)

```
% ionic capacitor run ios -l --external
```

### For Android (live reload)

```
% ionic capacitor run android -l --external
```

## Notice

Add to permission to AndroidManifest.xml

```
<uses-permission android:name="android.permission.SEND_SMS"/>
```