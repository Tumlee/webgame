import { GameMap } from "./game-map.js";
import { trafficController } from "./globals.js";

export class GameState {
    constructor() {
        this.joinedUsers = [];
        this.turnQueue = [];
        this.map = new GameMap();
    }

    joinUser(user) {
        console.log({user});

        if(this.joinedUsers.includes(user))
            return;
        
        this.joinedUsers.push(user);
        trafficController.broadcast('user-joined', {id: user.userId});
        this.enqueueUserTurn(user);
    }

    removeUser(user) {
        if(!this.joinedUsers.includes(user))
            return;

        this.joinedUsers = this.joinedUsers.filter(u => user != u);
        trafficController.broadcast('user-left', {id: user.userId});
        this.removeUserFromQueue(user);
    }

    removeUserFromQueue(user) {
        let oldCurrentUser = this.getCurrentUser();
        this.turnQueue = this.turnQueue.filter(queuedUser => queuedUser != user);

        if(oldCurrentUser != this.getCurrentUser())
            this.broadcastCurrentUser();
    }

    enqueueUserTurn(user) {
        let oldCurrentUser = this.getCurrentUser();
        this.removeUserFromQueue(user);
        this.turnQueue.push(user);

        //Broadcast to let everybody know whose turn it is now.
        if(oldCurrentUser != this.getCurrentUser())
            this.broadcastCurrentUser();
    }

    getCurrentUser() {
        return this.turnQueue[0];
    }

    broadcastCurrentUser() {
        let currentUser = this.getCurrentUser();
        let currentUserId = currentUser != null ? currentUser.userId : null;
        trafficController.broadcast('current-user', {id: currentUserId});
    }

    serialize() {
        //We need to transfer over the current user, list of joined users,
        //And the map state.
        let currentUser = this.getCurrentUser();
        let currentUserId = currentUser != null ? currentUser.id : null;
        return {
            joinedUsers: this.joinedUsers,
            currentUser: currentUserId,
            map: this.map,
        };
    }
}