import { TCNetClient, TCNetPacket } from "./";
import { TCNetConfiguration } from "./tcnet";
import {
    TCNetStatusPacket,
    TCNetDataPacketType,
    TCNetDataPacketMetadata,
    TCNetDataPacketBeatGridData,
    TCNetLayerStatus,
    TCNetDataPacketMetrics,
    TCNetLayerSyncMaster,
} from "./network";
import EventEmitter = require("events");
import { assert } from "console";


/**
 * High level implementation of TCNet for PioneerDJ equipment
 *
 * Currently only supports status changes and querying of track IDs
 */
export class PioneerDJTCClient extends EventEmitter {
    private tcnet: TCNetClient;
    private _state: PioneerDJState = new PioneerDJState();

    /**
     *
     * @param config configuration for TCNet access
     */
    constructor(config?: TCNetConfiguration) {
        super();

        if (!config) config = new TCNetConfiguration();

        this.tcnet = new TCNetClient(config);
    }

    /**
     * Connect to the TCNet network
     */
    async connect(): Promise<void> {
        this.tcnet.on("broadcast", this.receiveBroadcast.bind(this));
        await this.tcnet.connect();
    }

    /**
     * Disconnects from TCNet network
     */
    disconnect(): void {
        this.removeAllListeners();
        this.tcnet.disconnect();
        
    }

    /**
     * Receive a broadcast packet from the underlying TCNet implementation
     *
     * @param packet received broadcast packet
     */
    private receiveBroadcast(packet: TCNetPacket): void {
        if (packet instanceof TCNetStatusPacket) {
            // First update the current state - handlers can therefore savely query the state.
            const changedTracks = this._state.updateTrackIDs(packet.trackID);
            const changedStatus = this._state.updateStatus(packet.layerStatus);

            changedTracks.forEach((el) => {
                this.emit("changedtrack", el);
            });
            changedStatus.forEach((el) => {
                this.emit("changedstatus", el);
            });

            // Emit general status change when we see changes in track or status
            if (changedTracks.length > 0 || changedStatus.length > 0) {
                this.emit("statuschange");
            }
        }
    }

    /**
     * Access to current Pioneer DJ State
     */
    state(): PioneerDJState {
        return this._state;
    }

    /**
     * Access to underlying client
     */
    client(): TCNetClient {
        return this.tcnet;
    }

    /**
     * Request track info of a specific layer
     * @param layer layer to query
     * @returns track info of the layer
     */
    async trackInfo(layer: LayerIndex): Promise<TrackInfo> {
        const response = <TCNetDataPacketMetadata>(
            await this.client().requestData(TCNetDataPacketType.MetaData, layer)
        );
        return {
            ...response,
        };
    }

    /**
     * Request metrics of a specific layer
     * @param layer layer to query
     * @returns metrics of the layer
     */
    async layerMetrics(layer: LayerIndex): Promise<LayerMetrics> {
        const response = <TCNetDataPacketMetrics>(
            await this.client().requestData(TCNetDataPacketType.MetricsData, layer)
        );
        return {
            ...response,
        };
    }

        /**
     * Request beatgrid of a specific layer
     * @param layer layer to query
     * @returns metrics of the layer
     */
    async beatGridData(layer: LayerIndex): Promise<beatGridData> { 
        const response = <TCNetDataPacketBeatGridData>(
            await this.client().requestData(TCNetDataPacketType.BeatGridData, layer)
        );
        return {
            ...response,
        };
    }

}

/**
 * Enumeration of layers
 */
export enum LayerIndex {
    Layer1 = 1,
    Layer2 = 2,
    Layer3 = 3,
    Layer4 = 4,
    LayerA = 5,
    LayerB = 6,
    LayerM = 7,
    LayerC = 8,
}

/**
 * Util for LayerIndex
 */
export class LayerIndexUtil {
    /**
     * convert layer number (1-4) to layer index
     * @param layer Layer Number
     */
    public static layerToIdx(layer: number): LayerIndex {
        assert(1 <= layer && layer <= 4, "Layer Number must be in the range of 1-4");
        return layer;
    }
}

/**
 * Tracking the state of the Pioneer DJ equipments
 */
class PioneerDJState {
    private _trackID: number[] = new Array(8).fill(-1);
    private _status: TCNetLayerStatus[] = new Array(8).fill(-1);

    /**
     * Get track ID of layer
     * @param idx layer
     * @returns track ID
     */
    trackID(idx: LayerIndex): number {
        return this._trackID[idx - 1];
    }

    /**
     * Get status of layer
     * @param idx layer
     * @returns status
     */
    status(idx: LayerIndex): TCNetLayerStatus {
        return this._status[idx - 1];
    }

    /**
     * Updates Track IDs
     * @param trackIDs track IDs received from gear
     * @returns Changed layers
     */
    updateTrackIDs(trackIDs: number[]): LayerIndex[] {
        return this.update(this._trackID, trackIDs);
    }

    /**
     * Updates status
     * @param status statuses received from gear
     * @returns Changed layers
     */
    updateStatus(status: TCNetLayerStatus[]): LayerIndex[] {
        return this.update(this._status, status);
    }

    /**
     * Internal method for easy updating of fields
     * @param field field / array in this class
     * @param source Source date to update from
     * @returns Changed layers
     */
    private update(field: any[], source: any[]): LayerIndex[] {
        assert(source.length == 8, "there must be data for exactly 8 layers");
        const changedLayers: LayerIndex[] = [];

        for (let i = 0; i < source.length; i++) {
            if (field[i] !== source[i]) {
                field[i] = source[i];
                changedLayers.push(i + 1);
            }
        }

        return changedLayers;
    }
}

/**
 * Track Info type
 */
export type TrackInfo = {
    trackID: number;
    trackArtist: string;
    trackTitle: string;
    trackKey: number;
};

export type LayerMetrics = {
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
};

export type beatGridData = {
    dataSize : number;
    totalPacket : number;
    packetNo: number;
    dataClusterSize: number;
    beatNumber: number;
    beatType: number;
    beatTypeTimestamp: number;    
    packetNumber: number;
};
