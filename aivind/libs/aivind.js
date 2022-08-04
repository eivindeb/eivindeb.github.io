importScripts("aivind_engine.js")

createModule().then(({Engine}) => {
    var engine = null;
    onmessage = function(message) {
        if (message.data.type === 'INITIALIZE') {
            try {
                engine = new Engine(message.data.payload.engineSideInt, 20, 4194311, "");
                postMessage({
                    type: "initialization",
                    payload: {
                        status: "initialized"
                    }
                })
            }
            catch (err) {
                postMessage({
                    type: "initialization",
                    payload: {
                        status: err
                    }
                })
            }
        }
        else if (message.data.type === "MOVE") {
            console.log("making move " + message.data.payload.move)
            engine.moveMake(message.data.payload.move);
        }
        else if (message.data.type === 'CALCULATE') {
            if (message.data.payload.lastMove) {
                engine.moveMake(message.data.payload.lastMove);
            }
            if (message.data.payload.wTime) {
                engine.setTimerInfo(message.data.payload.wTime,
                    message.data.payload.bTime,
                    message.data.payload.wTimeInc,
                    message.data.payload.bTimeInc)
            }

            var engineMove = engine.itDeep();
            var score = engine.evaluatePosition();
            postMessage({
                type: "move",
                payload: {
                    move: engineMove,
                    score: score
                }
            })
        } else if (message.data.type === "EVALUATE") {
            var score = engine.evaluatePosition();
            postMessage({
                type: "evaluation",
                payload: {
                    score: score
                }
            })
        } else {
            console.log("Unexpected message type " + message.data.type)
        }
    }
});
