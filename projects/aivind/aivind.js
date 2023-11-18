var engineSide = "b";
var engineSideInt = engineSide === "w" ? 1 : -1;
const engineWorker = new Worker("libs/aivind.js");
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
var $score = $("#score")
var $avatarImg = $("#avatar-img")
var $wClock = $("#wclock")
var $bClock = $("#bclock")
var game = Chess()
var lastMove = null;
var wTimeLeft = 1 * 60 * 1000;
var bTimeLeft = 1 * 60 * 1000;
var wInc = 3 * 1000;
var bInc = 3 * 1000;
var clockUpdateInterval = 10;
var started = false;
var clockUpdateHandle = null;
var gameIsOver = false;
var engineStarted = false;

var $settings = $("#settings")
var $pTime = $("#ptime");
var $eTime = $("#etime");
var $pInc = $("#pinc");
var $eInc = $("#einc");
var $sideW = $("#play-as-white");
var $sideB = $("#play-as-black");
var $initiateBtn = $("#initiate-btn");

$sideW.prop("checked", true);
$('input[type=radio][name=side]').change(function() {
    if (this.value === 'w') {
        engineSide = "b";
        engineSideInt = -1;
        var tempTime = wTimeLeft;
        wTimeLeft = bTimeLeft;
        bTimeLeft = tempTime;
        board.orientation("white");
        $initiateBtn.hide();
    }
    else if (this.value === 'b') {
        engineSide = "w";
        engineSideInt = 1;
        var tempTime = bTimeLeft;
        bTimeLeft = wTimeLeft;
        wTimeLeft = tempTime;
        board.orientation("black");
        $initiateBtn.show();
    }
    updateClockDisplay();
});

$pTime.change(function() {
    if (engineSide === "w") {
        bTimeLeft = $pTime.val() * 1000;
    } else {
        wTimeLeft = $pTime.val() * 1000;
    }
    updateClockDisplay();
});

$eTime.change(function() {
    if (engineSide === "w") {
        wTimeLeft = $eTime.val() * 1000;
    } else {
        bTimeLeft = $eTime.val() * 1000;
    }
    updateClockDisplay();
});

$pInc.change(function() {
    if (engineSide === "w") {
        bInc = $pInc.val() * 1000;
    } else {
        wInc = $pInc.val() * 1000;
    }
});

$eInc.change(function() {
    if (engineSide === "w") {
        wInc = $eInc.val() * 1000;
    } else {
        bInc = $eInc.val() * 1000;
    }
    updateClockDisplay();
});

$wClock.text(formatMs(wTimeLeft))
$bClock.text(formatMs(bTimeLeft))

function toggleSettingsWindow() {  // TODO: fix engine losing on time.
    $settings.toggle();
}

function initiateGame() {
    if (!started) {
        console.log("Initiate game button pressed, starting game")
        game.reset();
        board.start();
        $initiateBtn.hide();
        if (engineSide === "w") {
            startEngine();
            setAvatar(0, true)
            getEngineMove();
        }
    }
    else {
        console.log("Game state is invalid for initiate game button to be pressed")
        }
}

function gameOver(winner) {
    // fix game outcome box and set status
    clearInterval(clockUpdateHandle);
    gameIsOver = true;
    if (winner[0].toLowerCase() === engineSide) {
        setAvatar(1000 * engineSideInt);
        $status.text("You lost. Better luck next time!")
    } else if (winner === "draw") {
        setAvatar(0);
        $status.text("The game is drawn!")
    } else {
        setAvatar(-1000 * engineSideInt);
        $status.text("Congratulations, you beat me!")
    }
}

function formatMs(ms) {
    function pad(n) {
    return (n < 10 ? "0" + n : n);
    }

    var m = Math.floor(ms / (60 * 1000));
    var s = Math.floor(ms / 1000 - m * 60);
    var ds = Math.floor(ms / 100 - s * 10 - m * 60 * 10)

    return pad(m) +":"+ pad(s) + "." + ds;
}

function updateClockDisplay() {
    $wClock.text(formatMs(wTimeLeft));
    $bClock.text(formatMs(bTimeLeft));
}

function updateClock() {
    if (game.turn() === "w") {
        wTimeLeft -= clockUpdateInterval;
        if (wTimeLeft <= 0) {
            gameOver("Black");
        }
    } else {
        bTimeLeft -= clockUpdateInterval;
        if (bTimeLeft <= 0) {
            gameOver("White");
        }
    }
    updateClockDisplay();
}

var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'

engineWorker.onmessage = function(message) {
    if (message.data.type === "move") {
        var engineMove = message.data.payload.move
        executeEngineMove(engineMove);
        setAvatar(message.data.payload.score, false);
    }
    else if (message.data.type === "evaluation") {
        setAvatar(message.data.payload.score, false);
    } else if (message.data.type === "initialization") {
        if (message.data.payload.status === "initialized") {
            console.log("Engine started");
            engineStarted = true;
        } else {
            alert("Engine initialization failed with the following error message: " + message.data.payload.status)
        }
    } else {
        console.log("Unexpected message type " + message.data.type)
    }
}

function removeGreySquares () {
    $('#board .square-55d63').css('background', '')
}

function greySquare (square) {
    var $square = $('#board .square-' + square)

    var background = whiteSquareGrey
    if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
    }

    $square.css('background', background)
}

function startEngine() {
    engineWorker.postMessage({
        type: "INITIALIZE",
        payload: {
            engineSideInt: engineSideInt
        }
    })
}

function setAvatar(score, calculating=false) {
    console.log("Setting avatar with score " + score + " and calculating " + calculating)
    if (calculating) {
        $avatarImg.attr("src", "img/avatars/thinking.png")
    }
    else if ((score <= 250) && (score >= -250)) {
        $avatarImg.attr("src", "img/avatars/neutral.png")
    }
    else if (score * engineSideInt >= 250) {
        $avatarImg.attr("src", "img/avatars/positive.png")
    }
    else {
        $avatarImg.attr("src", "img/avatars/negative.png")
    }
}

function onMouseoverSquare (square, piece) {
    if (!gameIsOver) {
        // get list of possible moves for this square
        var moves = game.moves({
        square: square,
        verbose: true
        })

        // exit if there are no moves available for this square
        if (moves.length === 0) return

        // highlight the square they moused over
        greySquare(square)

        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to)
        }
    }
}

function onMouseoutSquare (square, piece) {
    removeGreySquares()
}

function onDragStart (source, piece, position, orientation) {
    if (gameIsOver) return false;
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;
    if (game.turn() === engineSide) return false;

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
    }
}

function onDrop (source, target) {
    if (!engineStarted) {
        //$settings
        startEngine();
    }
    removeGreySquares()
    // see if the move is legal
    var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // TODO: NOTE: always promote to a queen for example simplicity
    })

    // illegal move
    if (move === null) return 'snapback'
    lastMove = source + target;
    if ((target[1] === "1" || target[1] === "8") && (move.piece === "p")) {
        lastMove = lastMove + "q"
    }
    if (!started) {
        started = true;
        clockUpdateHandle = setInterval(updateClock, clockUpdateInterval)
    }
    if (game.turn() === "w") {
        bTimeLeft += bInc;
    } else {
        wTimeLeft += wInc;
    }
    updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
    board.position(game.fen())
    if (game.turn() === engineSide) {
    setAvatar(0, true)
    getEngineMove();
    }
}

function random_choice(probs) {
    var pick = Math.random();
    for(var j=0; j < probs.length; j++){
        pick -= probs[j];
        if(pick <= 0){
            return j;
        }
    }
}

function executeEngineMove(move, evaluate = false) {
    var moveObject = {from: move.substr(0, 2), to: move.substr(2, 4)}
    if (move.length === 5) {
        moveObject.promotion = move[4];
    }
    game.move(moveObject);
    if (game.turn() === "w") {
        bTimeLeft += bInc;
        } else {
            wTimeLeft += wInc;
        }
    board.position(game.fen());
    if (evaluate) {
        engineWorker.postMessage({
            type: "EVALUATE"
        })
    }
    updateStatus();
}

function sleep(ms) {
    console.log("sleeping " + ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getEngineMove() {  // TODO: possible bug with castling. In this position ('r1b1k2r/p1p1bppp/2p5/8/8/8/PPP2PPP/RNB2RK1 b kq - 1 11'), engine made move e8h8, while it should be e8g8.
    url_fen = game.fen().replaceAll(" ", "%20")
    var request = $.get("https://explorer.lichess.ovh/master?fen=" + url_fen + "&topGames=0");

    request.done(async function (response) {
        if (response.moves.length <= 1) {
            engineWorker.postMessage({
                type: "CALCULATE",
                payload: {
                    lastMove: lastMove,
                    wTime: wTimeLeft,
                    bTime: bTimeLeft,
                    wTimeInc: wInc,
                    bTimeInc: bInc
                }
            })
        } else {
            var total_count = 0;
            for (var i = 0; i < response.moves.length; i++) {
                response.moves[i].tot = response.moves[i].white + response.moves[i].black + response.moves[i].draws;
                total_count += response.moves[i].tot;
            }
            probs = []
            for (var i = 0; i < response.moves.length; i++) {
                probs.push(response.moves[i].tot / total_count);
            }
            await sleep(Math.random() * 500 + 500);
            var move = response.moves[random_choice(probs)].uci;
            engineWorker.postMessage({
                type: "MOVE",
                payload: {
                    move: lastMove
                }
            });
            engineWorker.postMessage({
                type: "MOVE",
                payload: {
                    move: move
                }
            });
            if (!gameIsOver) {
                executeEngineMove(move, true);
            }
            updateStatus();
        }
    })

    request.fail(function (jqXHR, textStatus, errorThrown) {
        engineWorker.postMessage({
            type: "CALCULATE",
            payload: {
                lastMove: lastMove,
                wTime: wTimeLeft,
                bTime: bTimeLeft,
                wTimeInc: wInc,
                bTimeInc: bInc
            }
        })
    })

}

function updateStatus () {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
    moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        var winner = moveColor === "White" ? "Black" : "White";
        gameOver(winner);
    }
    // draw?
    else if (game.in_draw()) {
        gameOver("Draw")
    }

    // game still on
    else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
        status += ', ' + moveColor + ' is in check'
    }
    }

    $status.html(status)
    $fen.html(game.fen())
    $pgn.html(game.pgn())
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare
}
board = Chessboard('board', config);

updateStatus();