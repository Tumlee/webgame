import { GameState } from "./game-state.js";
import { TrafficController } from "./traffic-controller.js";

export let trafficController = null;
export let gameState = null;
export let userIdByClientId = {};
export let users = {};

export function initGlobals() {
    trafficController = new TrafficController();
    gameState = new GameState();
}