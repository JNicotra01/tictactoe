// jshint esversion: 6
let boards = {};
let counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let verticalCount = 3;
let timeouts = [];
let huPlayer = "X";
let aiPlayer = "O";
let activeBoard;
let displayBoard;
let delay = false;
let password = "";
let correctPassword = "password";
// [[x, y, id]]
let nodes = [];
class Board {
  /*
   * parentID
   * index
   * state
   */
  constructor(player, depth, args) {
    // Index concatenated to parent id, 1 if undefined
    this.id = args.parentID + args.index || "1";
    // Board state, empty state if undefined
    this.state = args.state || "012345678";
    this.isBest = args.isBest;
    // Increment counter for current depth
    counts[this.id.length - 1]++;
    // Add to boards object
    boards[this.id] = this;
    // Game state array [Win, Lose, Draw]
    // Used to calculate win/lose/draw percents
    if (!isOver(this.state.split(""))) this.percents = [0, 0, 0];
    if (isOver(this.state.split("")) && args.isBest) {
      // For each parent
      for (let i = this.id.length - 1; i >= 1; i--) {
        let state = -1;
        // AI won
        if (winning(this.state.split(""), aiPlayer)) state = 0;
        // AI lost
        else if (winning(this.state.split(""), huPlayer)) state = 1;
        // Draw
        else state = 2;
        boards[this.id.substring(0, i)].percents[state]++;
      }
    }
    // If depth limit or terminal state reached
    if (depth === 0 || isOver(this.state.split(""))) {
      // Set children size to 0
      this.children = 0;
      // Exit node
      return;
    }
    // Index counter
    let i = 0;
    let bestMove;
    let best = true;
    if (player == "X") bestMove = minimax(this.state.split(""), "O", -Infinity, Infinity, 1).index;
    // Go through each possible move
    for (let move of this.state.split("").filter(val => !isNaN(val))) {
      if (bestMove !== undefined) best = (bestMove == move);
      // Initialize child state
      let childState = this.state.split("");
      // Update child state with move at position
      childState[move] = player;
      // Create child node
      new Board(player == "X" ? "O" : "X", depth - 1, {
        parentID: this.id,
        index: ++i,
        state: childState.join(""),
        isBest: best
      });
    }
    this.children = i;
  }

  drawTree(w, h, x, y, depth, radius, childCount, parentCount) {
    if (depth < 1) return;
    push();
    strokeWeight(2);
    //translate(x, y);
    // Green if AI won
    if (winning(this.state.split(""), aiPlayer)) {
      fill(0, 255, 0);
      stroke(0, 255, 0);
      // Red if player won
    } else if (winning(this.state.split(""), huPlayer)) {
      fill(255, 0, 0);
      stroke(255, 0, 0);
    } else if (isOver(this.state.split(""))) {
      stroke(0);
      // line(x + (radius * cos(135)), y + (radius * sin(135)), x + (radius * cos(315)), y + (radius * sin(315)));
      // line(x + (radius * cos(45)), y + (radius * sin(45)), x + (radius * cos(225)), y + (radius * sin(225)));
      // Blank if neither player won
    } else {
      noFill();
      stroke(0);
    }
    nodes.push([x, y, this.id]);
    ellipse(x, y, radius * 2);
    let xOffset = w / childCount;
    //if (depth == 1) return;
    if (!isOver(this.state.split(""))) {
      for (let i = 0; i < this.children; i++) {
        //line(0, radius, 0, h/4-radius);
        //line(0, radius, parentOffset / -2, h / 4 - radius);
        // childCount * (childCount - 1)
        let childX = x - (w / parentCount / 2) + ((1 + (2 * i)) * w / (childCount * 2));
        let childY = y + (h / verticalCount);
        if (depth > 1) line(x, y + radius, childX, childY - radius);
        boards[this.id + (i + 1)].drawTree(w, h, childX, childY, depth - 1, radius, childCount * (childCount - 1), childCount);
      }
    }
    pop();
  }
}
// Reset boards object
boards = {};
// Generate all boards
new Board("X", 9, {});
//console.log(boards);
// Log counts at each depth
console.log(counts.join(", "));
// Log total count
console.log(counts.reduce((val1, val2) => val1 + val2));

function setup() {
  let canvas = createCanvas(1000, 520);
  canvas.mousePressed(click);
  frameRate(10);
  activeBoard = boards[1];
  displayBoard = boards[1];
  angleMode(DEGREES);
}

function draw() {
  background(255);
  // Translate to center
  // Pre-computed depth counts
  let radii = [504, 336, 210, 120, 60, 24, 6, 2, 1];
  // Set display board to active board (Clear preview)
  if (!delay) displayBoard = boards[activeBoard.id];
  // Current game depth
  let d = displayBoard.state.split("").filter(n => isNaN(n)).length;
  // Get radius based on depth, max width/48
  let radius = min(width / 2 / radii[d], width / 48) / 2;
  push();
  translate(width / 2, 0);
  // Reset displayed nodes array
  nodes = [];
  displayBoard.drawTree(width / 2, (height - 20), width / 4, (height - 20) / verticalCount / 2, verticalCount, radius, displayBoard.state.split("").filter(n => !isNaN(n)).length, 1);
  //console.log(displayBoard);//text(width/2, 0, displayBoard.percents);
  pop();
  // Initialize preview board to undefined
  let preview;
  // For each board state in nodes array
  for (let node of nodes) {
    // If mouse is near node
    if (dist(mouseX, mouseY, node[0] + width / 2, node[1]) <= min(radius * 2, width / 96))
      // Update preview board
      preview = boards[node[2]];
  }
  // Draw current board & preview board
  drawBoard(width / 2, (height - 20), preview);
  // console.log(getPlayer(activeBoard.state.split("")));
  if (activeBoard.hasOwnProperty("percents")) {
    // Draw percentages
    push();
    translate(0, 500);
    let arr = activeBoard.percents;
    let total = arr.reduce((val1, val2) => val1 + val2);
    noStroke();
    // Win
    let w1 = (arr[0] / total) * width;
    fill(66, 255, 66);
    rect(0, 0, w1, 20);
    // Draw
    let w2 = (arr[2] / total) * width;
    fill(190, 190, 190);
    rect(w1, 0, w2, 20);
    // Lose
    let w3 = (arr[1] / total) * width;
    fill(255, 66, 66);
    rect(w1 + w2, 0, w3, 20);
    pop();
  }
}

function keyPressed() {
  // When space is pressed
  if (keyCode == 32) {
    // Reset stored password
    password = "";
    // Clear all timeouts
    for (let timeout of timeouts) {
      window.clearTimeout(timeout);
    }
    timeouts = [];
    // Reset board
    activeBoard = boards[1];
    displayBoard = boards[1];
    // Reset delay variable
    delay = false;
  } else {
    password += key;
  }
}

function drawBoard(w, h, preview) {
  // Reset board
  push();
  stroke(0);
  strokeWeight(w / 25);
  strokeCap(SQUARE);
  // Upper Horizontal
  line(0, h / 3, w, h / 3);
  // Lower Horizontal
  line(0, (2 * h) / 3, w, (2 * h) / 3);
  // Left Vertical
  line(w / 3, 0, w / 3, h);
  // Right Vertical
  line((2 * w) / 3, 0, (2 * w) / 3, h);
  pop();
  // Get current board
  let board = activeBoard.state.split("");
  // Get optional preview board
  if (preview !== undefined) previewBoard = preview.state.split("");
  // For each value in board
  board.forEach(function (value, index) {
    push();
    strokeWeight(w / 50);
    noFill();
    // Index -> Row / Col
    let row = floor(index / 3);
    let col = index % 3;
    // Translate to position
    translate((w / 3) * col, (h / 3) * row);
    // Light gray if preview, black otherwise
    stroke((preview !== undefined && previewBoard[index] != value) ? 200 : 0);
    if (value == "X" || (preview !== undefined && previewBoard[index] == "X")) {
      if (password == correctPassword) stroke(212, 175, 55);
      // Draw X at position
      line((w / 3) * 0.3, (h / 3) * 0.3, (w / 3) * 0.7, (h / 3) * 0.7);
      line((w / 3) * 0.7, (h / 3) * 0.3, (w / 3) * 0.3, (h / 3) * 0.7);
    } else if (value == "O" || (preview !== undefined && previewBoard[index] == "O")) {
      // Draw O at position
      translate(w / 6, h / 6);
      ellipse(0, 0, (w / 3) * 0.4, (h / 3) * 0.4);
    }
    pop();
  });
  push();
  let done = isDone((preview !== undefined) ? previewBoard : board);
  if (done > 0) {
    push();
    noFill();
    // Slightly transparent if preview shown
    stroke(255, 0, 0, preview !== undefined ? 200 : 1000);
    strokeWeight(w / 25);
    // Draw line showing where player won
    switch (done) {
      case 1:
        line(w / 6, h / 6, 5 * w / 6, h / 6);
        break;
      case 2:
        line(w / 6, 3 * h / 6, 5 * w / 6, 3 * h / 6);
        break;
      case 3:
        line(w / 6, 5 * h / 6, 5 * w / 6, 5 * h / 6);
        break;
      case 4:
        line(w / 6, h / 6, w / 6, 5 * h / 6);
        break;
      case 5:
        line(3 * w / 6, h / 6, 3 * w / 6, 5 * h / 6);
        break;
      case 6:
        line(5 * w / 6, h / 6, 5 * w / 6, 5 * h / 6);
        break;
      case 7:
        line(w / 6, h / 6, 5 * w / 6, 5 * h / 6);
        break;
      case 8:
        line(w / 6, 5 * h / 6, 5 * w / 6, h / 6);
        break;
    }
    pop();
  }
}

function makeMove(aiPlayer, index) {
  if (aiPlayer === undefined || index === undefined) return;
  // Get index of position clicked in empty cells
  let i = activeBoard.state.split("").filter(n => !isNaN(n)).indexOf(index.toString());
  // Wait until AI has made move
  if ((delay && !aiPlayer) || i == -1) return;
  // Prevent additional moves until current move is finished
  delay = true;
  // Add timeout to timeouts array (to clear on reset)
  timeouts.push(setTimeout(function () {
    // Get id of sub-board with clicked position
    let id = activeBoard.id + (i + 1);
    // Update active board
    activeBoard = boards[id];
    // Make AI move if it was the human's turn
    if (!aiPlayer) makeMove(true, minimax(activeBoard.state.split(""), getPlayer(activeBoard.state.split("")), -Infinity, Infinity, 1).index);
    // Set AI move as finished
    else delay = false;
    // let arr = activeBoard.percents;
    // let total = arr.reduce((val1, val2) => val1 + val2);
    // console.log("Total: " + total);
    // console.log("Win: " + ((arr[0] / total) * 100).toFixed(2) + "%");
    // console.log("Lose: " + ((arr[1] / total) * 100).toFixed(2) + "%");
    // console.log("Draw: " + ((arr[2] / total) * 100).toFixed(2) + "%");
    // Delay is 1 second if AI move, 0 seconds if human move
  }, (aiPlayer) ? 750 : 0));
}

function getPlayer(board) {
  // X Count
  let xc = board.filter(val => val == "X").length;
  // O Count
  let oc = board.filter(val => val == "O").length;
  // console.log(xc + ", " + oc);
  return (oc == xc) ? "X" : "O";
}

function click() {
  // Exit if not on board section or game over
  if (mouseX > width / 2 || isOver(activeBoard.state.split(""))) return;
  // Calculate X, Y, & Index values
  let x = floor(mouseX / (width / 6)),
    y = floor((mouseY) / (height / 3)),
    index = (y * 3 + x);
  // Make human move
  makeMove(false, index);
}

function isOver(board) {
  return (
    board.filter(val => !isNaN(val)).length === 0 ||
    (board[0] == board[1] && board[1] == board[2]) ||
    (board[3] == board[4] && board[4] == board[5]) ||
    (board[6] == board[7] && board[7] == board[8]) ||
    (board[0] == board[3] && board[3] == board[6]) ||
    (board[1] == board[4] && board[4] == board[7]) ||
    (board[2] == board[5] && board[5] == board[8]) ||
    (board[0] == board[4] && board[4] == board[8]) ||
    (board[2] == board[4] && board[4] == board[6])
  );
}

function isDone(arr) {
  if (arr[0] == arr[1] && arr[0] == arr[2] && isNaN(arr[2])) return 1;
  else if (arr[3] == arr[4] && arr[3] == arr[5] && isNaN(arr[5])) return 2;
  else if (arr[6] == arr[7] && arr[6] == arr[8] && isNaN(arr[8])) return 3;
  else if (arr[0] == arr[3] && arr[0] == arr[6] && isNaN(arr[6])) return 4;
  else if (arr[1] == arr[4] && arr[1] == arr[7] && isNaN(arr[7])) return 5;
  else if (arr[2] == arr[5] && arr[2] == arr[8] && isNaN(arr[8])) return 6;
  else if (arr[0] == arr[4] && arr[0] == arr[8] && isNaN(arr[8])) return 7;
  else if (arr[2] == arr[4] && arr[2] == arr[6] && isNaN(arr[6])) return 8;
  else if (arr.filter((val) => val !== 0).length == arr.length) return 9;
  else return 0;
}

function minimax(newBoard, player, alpha, beta, depth) {
  //counts[depth - 1]++;
  //add one to function calls
  //fc++;

  //available spots
  let availSpots = emptyIndexies(newBoard);

  // checks for the terminal states such as win, lose, and tie and returning a value accordingly
  if (winning(newBoard, huPlayer)) {
    return {
      score: (password == correctPassword) ? 10 : -10
    };
  } else if (winning(newBoard, aiPlayer)) {
    return {
      score: (password == correctPassword) ? -10 : 10
    };
  } else if (availSpots.length === 0) {
    return {
      score: 0
    };
  }

  // an array to collect all the objects
  let moves = [];

  // loop through available spots
  for (let i = 0; i < availSpots.length; i++) {
    //create an object for each and store the index of that spot that was stored as a number in the object's index key
    let move = {};
    move.index = newBoard[availSpots[i]];

    // set the empty spot to the current player
    newBoard[availSpots[i]] = player;

    //if collect the score resulted from calling minimax on the opponent of the current player
    if (player == aiPlayer) {
      let result = minimax(newBoard, huPlayer, alpha, beta, depth + 1);
      move.score = result.score;
    } else {
      let result = minimax(newBoard, aiPlayer, alpha, beta, depth + 1);
      move.score = result.score;
    }

    //reset the spot to empty
    newBoard[availSpots[i]] = move.index;

    // push the object to the array
    moves.push(move);
  }

  // if it is the computer's turn loop over the moves and choose the move with the highest score
  let bestMove;
  if (player === aiPlayer) {
    let bestScore = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score > bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  } else {
    // else loop over the moves and choose the move with the lowest score
    let bestScore = Infinity;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  }

  // return the chosen move (object) from the array to the higher depth
  return moves[bestMove];
}

// returns the available spots on the board
function emptyIndexies(board) {
  return board.filter(s => !isNaN(s));
}

function winning(board, player) {
  return (
    (board[0] == player && board[1] == player && board[2] == player) ||
    (board[3] == player && board[4] == player && board[5] == player) ||
    (board[6] == player && board[7] == player && board[8] == player) ||
    (board[0] == player && board[3] == player && board[6] == player) ||
    (board[1] == player && board[4] == player && board[7] == player) ||
    (board[2] == player && board[5] == player && board[8] == player) ||
    (board[0] == player && board[4] == player && board[8] == player) ||
    (board[2] == player && board[4] == player && board[6] == player)
  );
}