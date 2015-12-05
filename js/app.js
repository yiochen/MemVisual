var x = 100;
var y = 100;
var box;
var cfree = [0xE6E6E6, 0xF2F2F2];
var cused = [[0x9FF781, 0xCEF6E3], [0xF78181, 0xF8E0E0]];
var mems = [1, 2, 1, 3, 4, 2, 5, 0];
var boxes = new Group();
var paddle;
var ball;
var wT, wB, wL, wR; //wallTop, wallBottom, wallLeft, wallRight
var launched = false;

var CONST = {
    initX: 0,
    initY: 0,
    uw: 80, //unit width
    uh: 30, //unit height
    maxX: 640,
    maxY: 480,
    paddleY: 470,
    paddleH: 20,
    paddleW: 80,
    ballR: 5,
    wallHT: 5, //wall half thickness
    speed: -9,
    maxSkew: 30,
};

function parseText(file) {
    console.log(file);
    console.log(typeof (file));
}

function initBoxes() {
    var x = CONST.initX + CONST.uw / 2;
    var y = CONST.initY + CONST.uh / 2;
    var box;
    for (var i of mems) {
        for (var j = 0; j < i; j++) {

            boxes.add(box = createSprite(x, y, CONST.uw, CONST.uh));
            box.immovable = true;
            x += CONST.uw;
            if (x >= CONST.maxX) {
                x = CONST.initX + CONST.uw / 2;
                y += CONST.uh;
            }
        }

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
    initBoxes();
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

};