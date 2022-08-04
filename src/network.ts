import { assert } from "console";
import { generateKey } from "crypto";

export enum TCNetMessageType {
    OptIn = 2,
    OptOut = 3,
    Status = 5,
    TimeSync = 10,
    Error = 13,
    Request = 20,
    ApplicationData = 30,
    Control = 101,
    Text = 128,
    Keyboard = 132,
    Data = 200,
    File = 204,
    Time = 254,
}

export enum TCNetDataPacketType {
    MetricsData = 2,
    MetaData = 4,
    BeatGridData = 8,
    CUEData = 12,
    SmallWaveFormData = 16,
    BigWaveFormData = 32,
    MixerData = 150,
}

export enum NodeType {
    Auto = 1,
    Master = 2,
    Slave = 4,
    Repeater = 8,
}

interface TCNetReaderWriter {
    read(): void;
    write(): void;
}

export abstract class TCNetPacket implements TCNetReaderWriter {
    buffer: Buffer;
    header: TCNetManagementHeader;

    abstract read(): void;
    abstract write(): void;
    abstract length(): number;
    abstract type(): number;
}

export class TCNetManagementHeader implements TCNetReaderWriter {
    static MAJOR_VERSION = 3;
    static MAGIC_HEADER = "TCN";

    buffer: Buffer;

    nodeId: number;
    minorVersion: number;
    messageType: TCNetMessageType;
    nodeName: string;
    seq: number;
    nodeType: number;
    nodeOptions: number;
    timestamp: number;

    constructor(buffer: Buffer) {
        this.buffer = buffer;
    }

    public read(): void {
        this.nodeId = this.buffer.readUInt16LE(0);

        assert(this.buffer.readUInt8(2) == TCNetManagementHeader.MAJOR_VERSION);
        this.minorVersion = this.buffer.readUInt8(3);
        assert(this.buffer.slice(4, 7).toString("ascii") == TCNetManagementHeader.MAGIC_HEADER);

        this.messageType = this.buffer.readUInt8(7);
        this.nodeName = this.buffer.slice(8, 16).toString("ascii").replace(/\0.*$/g, "");
        this.seq = this.buffer.readUInt8(16);
        this.nodeType = this.buffer.readUInt8(17);
        this.nodeOptions = this.buffer.readUInt16LE(18);
        this.timestamp = this.buffer.readUInt32LE(20);
    }

    public write(): void {
        assert(Buffer.from(this.nodeName, "ascii").length <= 8);

        this.buffer.writeUInt16LE(this.nodeId, 0);
        this.buffer.writeUInt8(TCNetManagementHeader.MAJOR_VERSION, 2);
        this.buffer.writeUInt8(this.minorVersion, 3);
        this.buffer.write(TCNetManagementHeader.MAGIC_HEADER, 4, "ascii");
        this.buffer.writeUInt8(this.messageType, 7);
        this.buffer.write(this.nodeName.padEnd(8, "\x00"), 8, "ascii");
        this.buffer.writeUInt8(this.seq, 16);
        this.buffer.writeUInt8(this.nodeType, 17); // 02
        this.buffer.writeUInt16LE(this.nodeOptions, 18); // 07 00
        this.buffer.writeUInt32LE(this.timestamp, 20);
    }
}

export class TCNetOptInPacket extends TCNetPacket {
    nodeCount: number;
    nodeListenerPort: number;
    uptime: number;
    vendorName: string;
    appName: string;
    majorVersion: number;
    minorVersion: number;
    bugVersion: number;

    read(): void {
        this.nodeCount = this.buffer.readUInt16LE(24);
        this.nodeListenerPort = this.buffer.readUInt16LE(26);
        this.uptime = this.buffer.readUInt16LE(28);
        this.vendorName = this.buffer.slice(32, 48).toString("ascii").replace(/\0.*$/g, "");
        this.appName = this.buffer.slice(48, 64).toString("ascii").replace(/\0.*$/g, "");
        this.majorVersion = this.buffer.readUInt8(64);
        this.minorVersion = this.buffer.readUInt8(65);
        this.bugVersion = this.buffer.readUInt8(66);
    }
    write(): void {
        assert(Buffer.from(this.vendorName, "ascii").length <= 16);
        assert(Buffer.from(this.appName, "ascii").length <= 16);

        this.buffer.writeUInt16LE(this.nodeCount, 24);
        this.buffer.writeUInt16LE(this.nodeListenerPort, 26);
        this.buffer.writeUInt16LE(this.uptime, 28);
        this.buffer.write(this.vendorName.padEnd(16, "\x00"), 32, "ascii");
        this.buffer.write(this.appName.padEnd(16, "\x00"), 48, "ascii");
        this.buffer.writeUInt8(64, this.majorVersion);
        this.buffer.writeUInt8(65, this.minorVersion);
        this.buffer.writeUInt8(66, this.bugVersion);
    }

    length(): number {
        return 68;
    }

    type(): number {
        return TCNetMessageType.OptIn;
    }
}

export class TCNetOptOutPacket extends TCNetPacket {
    nodeCount: number;
    nodeListenerPort: number;

    read(): void {
        this.nodeCount = this.buffer.readUInt16LE(24);
        this.nodeListenerPort = this.buffer.readUInt16LE(26);
    }
    write(): void {
        this.buffer.writeUInt16LE(this.nodeCount, 24);
        this.buffer.writeUInt16LE(this.nodeListenerPort, 26);
    }

    length(): number {
        return 28;
    }

    type(): number {
        return TCNetMessageType.OptOut;
    }
}

export enum TCNetLayerStatus {
    IDLE = 0,
    PLAYING = 3,
    LOOPING = 4,
    PAUSED = 5,
    STOPPED = 6,
    CUEDOWN = 7,
    PLATTERDOWN = 8,
    FFWD = 9,
    FFRV = 10,
    HOLD = 11,
}

export class TCNetStatusPacket extends TCNetPacket {
    nodeCount: number;
    nodeListenerPort: number;
    layerSource: number[] = new Array(8);
    layerStatus: TCNetLayerStatus[] = new Array(8);
    trackID: number[] = new Array(8);
    smpteMode: number;
    autoMasterMode: number;
    layerName: string[] = new Array(8);

    read(): void {
        this.nodeCount = this.buffer.readUInt16LE(24);
        this.nodeListenerPort = this.buffer.readUInt16LE(26);

        for (let n = 0; n < 8; n++) {
            this.layerSource[n] = this.buffer.readUInt8(34 + n);
        }
        for (let n = 0; n < 8; n++) {
            this.layerStatus[n] = this.buffer.readUInt8(42 + n);
        }
        for (let n = 0; n < 8; n++) {
            this.trackID[n] = this.buffer.readUInt32LE(50 + n * 4);
        }
        this.smpteMode = this.buffer.readUInt8(83);
        this.autoMasterMode = this.buffer.readUInt8(84);

        for (let n = 0; n < 8; n++) {
            this.layerName[n] = this.buffer
                .slice(172 + n * 16, 172 + (n + 1) * 16)
                .toString("ascii")
                .replace(/\0.*$/g, "");
        }
    }
    write(): void {
        throw new Error("not supported!");
    }
    length(): number {
        return 300;
    }
    type(): number {
        return TCNetMessageType.Status;
    }
}

export class TCNetRequestPacket extends TCNetPacket {
    dataType: number;
    layer: number;

    read(): void {
        this.dataType = this.buffer.readUInt8(24);
        this.layer = this.buffer.readUInt8(25);
    }
    write(): void {
        assert(0 <= this.dataType && this.dataType <= 255);
        assert(0 <= this.layer && this.layer <= 255);

        this.buffer.writeUInt8(this.dataType, 24);
        this.buffer.writeUInt8(this.layer, 25);
    }
    length(): number {
        return 26;
    }
    type(): number {
        return TCNetMessageType.Request;
    }
}

export enum TCNetTimecodeState {
    Stopped = 0,
    Running = 1,
    ForceReSync = 2,
}

export class TCNetTimecode {
    mode: number;
    state: TCNetTimecodeState;
    hours: number;
    minutes: number;
    seconds: number;
    frames: number;

    read(buffer: Buffer, offset: number): void {
        this.mode = buffer.readUInt8(offset + 0);
        this.state = buffer.readUInt8(offset + 1);
        this.hours = buffer.readUInt8(offset + 2);
        this.minutes = buffer.readUInt8(offset + 3);
        this.seconds = buffer.readUInt8(offset + 4);
        this.frames = buffer.readUInt8(offset + 5);
    }
}

export class TCNetTimePacket extends TCNetPacket {
    layerCurrentTime: number[] = new Array(8);
    layerTotalTime: number[] = new Array(8);
    layerBeatmarker: number[] = new Array(8);
    layerState: TCNetLayerStatus[] = new Array(8);
    generalSMPTEMode: number;   
    layerTimecode: TCNetTimecode[] = new Array(8);
    

    read(): void {
        for (let n = 0; n < 8; n++) {
            this.layerCurrentTime[n] = this.buffer.readUInt32LE(24 + n * 4);
            this.layerTotalTime[n] = this.buffer.readUInt32LE(56 + n * 4);
            this.layerBeatmarker[n] = this.buffer.readUInt8(88 + n);
            this.layerState[n] = this.buffer.readUInt8(96 + n);
            this.layerTimecode[n] = new TCNetTimecode();
            this.layerTimecode[n].read(this.buffer, 106 + n * 6);
        }
        this.generalSMPTEMode = this.buffer.readUInt8(105);
    }
    write(): void {
        throw new Error("not supported!");
    }
    length(): number {
        return 154;
    }
    type(): number {
        return TCNetMessageType.Time;
    }
}

export class TCNetDataPacket extends TCNetPacket {
    dataType: TCNetDataPacketType;
    layer: number;

    read(): void {
        this.dataType = this.buffer.readUInt8(24);
        this.layer = this.buffer.readUInt8(25);
    }
    write(): void {
        assert(0 <= this.dataType && this.dataType <= 255);
        assert(0 <= this.layer && this.layer <= 255);

        this.buffer.writeUInt8(this.dataType, 24);
        this.buffer.writeUInt8(this.layer, 25);
    }
    length(): number {
        return -1;
    }
    type(): number {
        return TCNetMessageType.Data;
    }
}

export enum TCNetLayerSyncMaster {
    Slave = 0,
    Master = 1,
}

export class TCNetDataPacketMetrics extends TCNetDataPacket {
    state: TCNetLayerStatus;
    syncMaster: TCNetLayerSyncMaster;
    beatMarker: number;
    trackLength: number;
    currentPosition: number;
    speed: number;
    beatNumber: number;
    bpm: number;
    pitchBend: number;
    trackID: number;

    read(): void {
        this.state = this.buffer.readUInt8(27);
        this.syncMaster = this.buffer.readUInt8(29);
        this.beatMarker = this.buffer.readUInt8(31);
        this.trackLength = this.buffer.readUInt32LE(32);
        this.currentPosition = this.buffer.readUInt32LE(36);
        this.speed = this.buffer.readUInt32LE(40);
        this.beatNumber = this.buffer.readUInt32LE(57);
        this.bpm = this.buffer.readUInt32LE(112)/100;
        this.pitchBend = this.buffer.readUInt16LE(116);
        this.trackID = this.buffer.readUInt32LE(118);
    }

    write(): void {
        throw new Error("not supported!");
    }
    length(): number {
        return 122;
    }
}

export class TCNetDataPacketMetadata extends TCNetDataPacket {
    trackArtist: string;
    trackTitle: string;
    trackKey: number;
    trackID: number;

    read(): void {
        this.trackArtist = this.buffer.slice(29, 285).toString("ascii").replace(/\x00/g, "").trimEnd();
        this.trackTitle = this.buffer.slice(285, 541).toString("ascii").replace(/\x00/g, "").trimEnd();
        this.trackKey = this.buffer.readUInt16LE(541);
        this.trackID = this.buffer.readUInt32LE(543);
    }
    write(): void {
        throw new Error("not supported!");
    }
    length(): number {
        return 548;
    }
}

export interface Constructable {
    new (...args: any[]): any;
}

export const TCNetPackets: Record<TCNetMessageType, Constructable | null> = {
    [TCNetMessageType.OptIn]: TCNetOptInPacket,
    [TCNetMessageType.OptOut]: TCNetOptOutPacket,
    [TCNetMessageType.Status]: TCNetStatusPacket,
    [TCNetMessageType.TimeSync]: null, // not yet implemented
    [TCNetMessageType.Error]: null, // not yet implemented
    [TCNetMessageType.Request]: TCNetRequestPacket,
    [TCNetMessageType.ApplicationData]: null, // not yet implemented
    [TCNetMessageType.Control]: null, // not yet implemented
    [TCNetMessageType.Text]: null, // not yet implemented
    [TCNetMessageType.Keyboard]: null, // not yet implemented
    [TCNetMessageType.Data]: TCNetDataPacket,
    [TCNetMessageType.File]: null, // not yet implemented
    [TCNetMessageType.Time]: TCNetTimePacket,
};

export const TCNetDataPackets: Record<TCNetDataPacketType, typeof TCNetDataPacket | null> = {
    [TCNetDataPacketType.MetricsData]: TCNetDataPacketMetrics,
    [TCNetDataPacketType.MetaData]: TCNetDataPacketMetadata,
    [TCNetDataPacketType.BeatGridData]: null, // not yet implemented
    [TCNetDataPacketType.CUEData]: null, // not yet implemented
    [TCNetDataPacketType.SmallWaveFormData]: null, // not yet implemented
    [TCNetDataPacketType.BigWaveFormData]: null, // not yet implemented
    [TCNetDataPacketType.MixerData]: null, // not yet implemented
};
