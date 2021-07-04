# node-tcnet

This library tries implements the TCNet procotol of Showkontrol / Event Imagineering Group / Pioneer DJ described here: https://www.tc-supply.com/tcnet

It requires either Showkontrol / Beatkontrol (https://www.tc-supply.com/home) to be running on a Mac or PRO DJ LINK Bridge on Windows / Mac (https://www.pioneerdj.com/en/product/software/pro-dj-link-bridge/software/)

## Features

- [x] Connecting to a TCNet network
- [x] Listening to status events
- [x] Requesting song metadata of layers seperately
- [ ] Timestamp / Timesync / BPM capabilities of TCNet
- [ ] Other request packets like Beat Grid, Wave Form
- [ ] Control capabilities (like stopping layers) from TCNet

**This has only been tested against the Bridge software with NO DJMs or CDJs attached. Bascially this is an implementation solely on the protocol documentation. Testing on real equipment is needed.**

## Example
```typescript
import { TCNetConfiguration, PioneerDJTCClient, LayerIndex } from "node-tcnet"

async function main() {
    // Init new TCNet configuration
    const config = new TCNetConfiguration();

    // Linux
    config.broadcastInterface = "eth0";
    // Windows - at least for a *locally* running PRO DJ LINK BRIDGE
    config.broadcastAddress = "<ip address of selected interface>";
    
    // Init new client for Pioneer DJ TCNet
    const client = new PioneerDJTCClient(config);
    
    // Wait for connect
    await client.connect();

    // Ask for track information on Layer 1
    const layer1 = await client.trackInfo(LayerIndex.Layer1);
    console.log(layer1);
}

main();
```
### Windows Notes
Instead of `config.broadcastInterface` the address should be set. Windows works a bit different here with Broadcast.. Please set `config.broadcastAddress` to the interface selected in Pro DJ Link or when running on a different PC the IP address of your main interface.

## Comparable work
- Directly implementing ProDJLink: Implements the native protocol of Pioneer DJ players/mixers by emulating a CDJ in the network. This has the downside of trying to reverse-engineer an unknown protocol from Pioneer, with no documentation. However these libraries have some better support for other devices like the XDJ-XZ. Using TCNet has the benefit of a clear seperation between the productive Pro DJ Link network and a documented protocol.
  1. prolink-connect (JS) by @EvanPurkhiser https://github.com/EvanPurkhiser/prolink-connect
  2. dysentery (Java) by @Deep-Symmetry https://github.com/Deep-Symmetry/dysentery

## Disclaimer

This work has not been sponsored or endorsed by Pioneer DJ or Event Imagineering Group. All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.

