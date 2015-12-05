var x = 100;
var y = 100;
var box;
var cfree = {
    r: 230,
    g: 230,
    b: 230
};
var cused = [{
    r: 159,
    g: 247,
    b: 129
}, {
    r: 247,
    g: 129,
    b: 129
}];
var mems = [1, 2, 1, 3, 4, 2, 5, 0];
var boxes = new Group();
var paddle;
var ball;
var wT, wB, wL, wR; //wallTop, wallBottom, wallLeft, wallRight
var launched = false;

//data related variables
var listType; //list type, support Explicit, Implicit, Full
var rowSize; //memory row size
var memSize; //memory size
var memhead = 0x2222222;
var freebls = [];
var usedbls = [];
var bls = [];

// CONSTANTS
var FREE = 1;
var USED = 0;
var EXPLICIT = "Explicit";
var IMPLICIT = "Implicit";
var FULL = "Full";

var CONST = {
    initX: 0,
    initY: 0,
    uw: 80, //unit width
    uh: 30, //unit height
    maxX: 1200,
    maxY: 600,
    paddleH: 20,
    paddleW: 80,

    ballR: 5,
    wallHT: 5, //wall half thickness
    speed: -9,
    maxSkew: 30,
};
CONST.paddleY = CONST.maxY - CONST.paddleH;

/*
example input
Explicit 16 2304
# 11/2/12 - 8:02PM
0x11e9430 256
0x11e9130 256
0x11e9730 128
0x11e9330 256
0x11e9030 256
0x11e9630 256
*/
function parseText(file) {
    console.log(file);
    var lines = file.split("\n");
    var params = lines[0].split(" ");
    if (params.length < 3) {
        console.log("File format error");
        return false;
    }
    listType = params[0];
    rowSize = parseInt(params[1], 10);
    memSize = parseInt(params[2], 10);
    for (var i = 1; i < lines.length; i++) {
        //parse each line
        if (lines[i].length <= 0) break;
        if (lines[i].charAt(0) == '#') console.log(lines[i]);
        else {
            var args = lines[i].split(" ");
            var addr;
            if (args.length == 2) {
                //this is a free block
                var block;
                freebls.push({
                    address: addr = parseInt(args[0], 16),
                    size: parseInt(args[1], 10),
                    type: FREE
                });
                if (addr < memhead) memhead = addr;
            } else if (args.length == 3) {
                usedbls.push({
                    address: addr = parseInt(args[0], 16),
                    size: parseInt(args[1], 10),
                    rsize: parseInt(args[2], 10),
                    type: USED
                });
                if (addr < memhead) memhead = addr;
            } else {
                console.log("Error parsing file, line " + i + "has incorrect ammount of arguments");
                return false;
            }
        }
    }

    if (listType == EXPLICIT) {
        // add link
        for (var i = 0; i < freebls.length - 1; i++) {
            freebls[i].next = freebls[i + 1].address;
        }
    }

    function compare(a, b) {
        return a.address > b.address;
    }
    freebls.sort(compare);
    if (listType == EXPLICIT) {
        for (var i = 0; i < freebls.length - 1; i++) {
            var diff = freebls[i + 1].address - freebls[i].address;
            if (diff > freebls[i].size) {
                //there is a used block
                usedbls.push({
                    address: freebls[i].address + freebls[i].size,
                    size: diff - freebls[i].size,
                    type: USED
                })
            }
        }
        var lastfree = freebls[freebls.length - 1];
        var lastusedhead = lastfree.address + lastfree.size;
        if (memSize > lastfree.address + lastfree.size - memhead) {
            usedbls.push({
                address: lastfree.address + lastfree.size,
                size: memSize + memhead - lastusedhead,
                type: USED
            });
        }
    }
    bls = freebls.concat(usedbls);
    bls.sort(compare);

    //    for (var i = 0; i < freebls.length - 1; i++) {
    //        console.log("" + freebls[i].address + " " + freebls[i].size);
    //    }

    initBoxes();

    return true;
}

function initBoxes() {
    var x = CONST.initX + CONST.uw / 2;
    var y = CONST.initY + CONST.uh / 2;
    var box;
    //Following variables used for color calculation
    var uctr = 0; //used block counter
    var u2ctr = 0; //used block second level counter
    for (var block of bls) {
        var first = null;
        if (block.type == USED) {
            uctr = (uctr + 1) % 2;
        }
        var nblock = block.size / rowSize;
        var allocated = block.rsize;
        for (var j = 0; j < nblock; j++) {
            box = null;
            if (block.type == FREE) {
                boxes.add(box = createSprite(x, y, CONST.uw, CONST.uh));
                var clr = cfree;
                box.shapeColor = color(clr.r, clr.g, clr.b);
            } else if (block.type == USED) {
                boxes.add(box = createSprite(x, y, CONST.uw, CONST.uh));
                var clr = cused[uctr];
                box.shapeColor = color(clr.r, clr.g, clr.b);
            }
            if (box == null) {
                console.log("box initialization error");
                return;
            }
            if (first == null) first = box;
            box.immovable = true;
            x += CONST.uw;
            if (x >= CONST.maxX) {
                x = CONST.initX + CONST.uw / 2;
                y += CONST.uh;
            }
            if (allocated && allocated > rowSize) allocated -= rowSize;
            if (allocated && allocated < rowSize) {
                box.allocated = allocated / rowSize;
                allocated -= rowSize;
                if (allocated < 0) allocated = 0;
            }
        }
        first.address = block.address;

    }
}

function initWall() {
    //TOP
    wT = createSprite(CONST.maxX / 2, -CONST.wallHT, CONST.maxX, CONST.wallHT * 2);
    wT.immovable = true;
    //BOTTOM
    wB = createSprite(CONST.maxX / 2, CONST.maxY + CONST.wallHT + CONST.ballR * 2, CONST.maxX, CONST.wallHT * 2);
    wB.immovable = true;
    //LEFT
    wL = createSprite(-CONST.wallHT, CONST.maxY / 2, CONST.wallHT * 2, CONST.maxY);
    wL.immovable = true;
    //RIGHT
    wR = createSprite(CONST.maxX + CONST.wallHT, CONST.maxY / 2, CONST.wallHT * 2, CONST.maxY);
    wR.immovable = true;
}

function initPaddle() {
    paddle = createSprite(CONST.maxX / 2, CONST.paddleY, CONST.paddleW, CONST.paddleH);
    paddle.immovable = true;
}

function initBall() {
    ball = createSprite(CONST.maxX / 2, CONST.paddleY - CONST.paddleH / 2 - CONST.ballR, CONST.ballR * 2, CONST.ballR * 2);
}

function setup() {
    createCanvas(CONST.maxX, CONST.maxY).parent('canvContainer');
    httpGet("output.txt", null, "text", parseText);

    initPaddle();
    initBall();
    initWall();
    //p.loadImage('img/bitcamp.png', drawBitcamp);
    background(0, 0, 0);


};

function launch() {
    ball.setSpeed(CONST.speed, 90);
    launched = true;
}

function mousePressed() {
    if (!launched) {
        launch();
    }
}

function boxHit(ball, box) {
    box.remove();
    console.log("box removed" + boxes.length);
    if (boxes.length == 0) {
        gameOver(true);
    }
}

function gameOver(win) {
    console.log("GameOver");
    ball.remove();
    //ball = null;
}

function bounceBall() {
    if (!ball) {
        return;
    }
    ball.bounce(wT);
    ball.bounce(wL);
    ball.bounce(wR);
    if (ball.bounce(paddle)) {
        var skew = ball.position.x - paddle.position.x;
        ball.setSpeed(CONST.speed, 90 + skew / CONST.paddleW * CONST.maxSkew);
    }
    ball.bounce(boxes, boxHit);
    //lastly, check gameover
    if (ball.bounce(wB)) {
        //gameOver(false);
    }
}

function draw() {
    background(30, 30, 30);
    if (ball) bounceBall();
    var mx = mouseX;

    if (paddle && mx > 0 && mx < CONST.maxX) {
        paddle.position.x = mouseX;
        if (!launched && ball) {
            ball.position.x = paddle.position.x;
        }
    }
    drawSprites();
    for (var box of boxes) {
        var left = box.position.x - CONST.uw / 2;
        var right = box.position.x + CONST.uw / 2;
        var top = box.position.y - CONST.uh / 2;
        var bottom = box.position.y + CONST.uh / 2;
        noStroke();
        if (typeof box.allocated !== "undefined") {
            fill("#FFFFFF");
            rect(left + box.allocated * CONST.uw, top, (1 - box.allocated) * CONST.uw,
                CONST.uh
            );
        }
        if (typeof box.address !== "undefined") {
            fill("#222222")
            textSize(CONST.uh);
            text("0x" + box.address.toString(16), left, bottom);
        }

    }
    //    textSize(32);
    //    text("word", 10, 30);

};