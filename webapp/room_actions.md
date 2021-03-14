room description is a hierarchical structure

```
room.description
room.actions = [
    {
        name: "look chest"
        description: "The chest is made of rock, there what look like a button"
        actions: [{
            name: "press button",
            description: "<make it compelling to wait, procedural text>",
            actionIndex: 1
        }]
    },
    {
        name: "look stature",
        description: "The status is truly magificiant,...",
        actions: [
            {
                name: "touch",
                description: "nothing happen",
            }
        ]
    },
    {
        name "attack the <x>",
        description: "procedurally text on fight...",
        actionIndex: 0
    }
]
```

all actions have a back that bring them up in the hierarchy. No typing text... => full text display, scrolling ?

leaf are where real action can get executed, they have no actions field set
