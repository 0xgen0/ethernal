for every end of move
we record the blockNumber in the area where the move ends
(if multiple move happened to be on the same block, nothing get changed)
On the next action (in the next or future block) (any action) in that area will actualise that number
This call PureDungeon._generateRandomEvent which return both a room location and the event, for now it is always a monster
Later it could be a chest or NPC but it could also be a surprise (which will get actualised once someone enter that room)
Note though that if the following is true nothing happen:
- room has already a monster 
- room has some player in it 
- room has a previous event 
- room has not be discovered
The later point could be relaxed : event could be trigger in non-existing room, but this currently conflict with how monsterBlockNumber is generated (thoughthe issue will simply be that if a monster is generated via monsterBlockNumber then this would take precedence over the event)

Need to think more about chest and suprise event

Backend wise
the backend will now need to `RandomEvent` and calculate by calling PureDungeon the room location and event it will generate on next action (in future block)
then it will need to apply the same logic as above : discard if already a monster, some player or a previous event (not deleted yet) or if room is not discovered yet

