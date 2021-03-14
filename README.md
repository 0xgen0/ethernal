![alt text](./ethernal.png)

This is the code repository for [Ethernal](https://ethernal.world), an [ethereum](https://ethereum.org)-based game running fully on-chain built by [@Ohjia](https://github.com/Ohjia), [@lumir-mrkva](https://github.com/lumir-mrkva) and [@wighawag](https://github.com/wighawag) (Ethernal's original creator, whose early prototype can be found here : [https://github.com/wighawag/the_eternal_dungeon](https://github.com/wighawag/the_eternal_dungeon)).

Work on the game as stopped since Summer 2020 but you'll find here the source code of its last iteration.

The code is licensed as MIT, see [LICENSE](./LICENSE) file.


The game is composed from three modules:

- [contracts](contracts/)
- [backend](backend/)
- [webapp](webapp/)

Where `contracts` are responsible for game rules and data storage, `backend` caches and synchorizes data between frontend
clients and `webapp` provides user interface for players.

The whole app can be started locally by deploying local `contracts` first and then running `backend` and `webapp`.
    
Alternatively only `webapp` can be started connected to already deployed staging or production environment.
