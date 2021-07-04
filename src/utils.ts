import * as broadcastAddress from "broadcast-address";
import { networkInterfaces, platform } from "os";

export function interfaceAddress(ifname: string): string {
    const os = platform();

    if (os === "win32") {
        const intf = networkInterfaces()[ifname];
        if (!intf) {
            throw new Error(`Interface ${ifname} does not exist`);
        }

        const address = intf.find((el) => el.family == "IPv4");
        if (!address) {
            throw new Error(`Interface ${ifname} does not have IPv4 address`);
        }

        return address.address;
    } else {
        return broadcastAddress(ifname);
    }
}
