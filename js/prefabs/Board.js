var Match3 = Match3 || {};

Match3.Board = function(state, rows, cols, blockVariations) {

	this.state = state;
	this.rows = rows;
	this.cols = cols;
	this.blockVariations = blockVariations;

	// main grid
	this.grid = [];

	for (var i = 0; i < rows; i++) {
		this.grid.push([]);
		for (var j = 0; j < cols; j++) {
			this.grid[i].push(0);
		}
	}

	// reserve grid on the top, for when new blocks are needed
	this.reserveGrid = [];

	this.RESERVE_ROW = rows;

	for (var i = 0; i < this.RESERVE_ROW; i++) {
		this.reserveGrid.push([]);
		for (var j = 0; j < cols; j++) {
			this.reserveGrid[i].push(0);
		}
	}

	// populate grid
	this.populateGrid();
	this.populateReserveGrid();
};

Match3.Board.prototype.populateGrid = function() {
	var variation;
	for (var i = 0; i < this.rows; i++) {
		for (var j = 0; j < this.cols; j++) {
			variation = Math.floor(Math.random() * this.blockVariations) + 1;
			this.grid[i][j] = variation;
		}
	}
	
	// if there are any chains, re-populate
	var chains = this.findAllChains();
	if (chains.length > 0) {
		this.populateGrid();
	}
};

Match3.Board.prototype.populateReserveGrid = function() {
	var variation;
	for (var i = 0; i < this.RESERVE_ROW; i++) {
		for (var j = 0; j < this.cols; j++) {
			variation = Math.floor(Math.random() * this.blockVariations) + 1;
			this.reserveGrid[i][j] = variation;
		}
	}
};

Match3.Board.prototype.consoleLog = function() {

	var prettyString = '';

	for (var i = 0; i < this.RESERVE_ROW; i++) {
		for (var j = 0; j < this.cols; j++) {
			prettyString += this.reserveGrid[i][j] + ' ';
		}
		prettyString += '\n';
	}

	for (var j = 0; j < this.cols; j++) {
		prettyString += '- ';
	}

	prettyString += '\n';

	for (var i = 0; i < this.rows; i++) {
		for (var j = 0; j < this.cols; j++) {
			prettyString += this.grid[i][j] + ' ';
		}
		prettyString += '\n';
	}

	console.log(prettyString);

};

// swap blocks
Match3.Board.prototype.swap = function(source, target) {
	var temp = this.grid[target.row][target.col];
	this.grid[target.row][target.col] = this.grid[source.row][source.col];
	this.grid[source.row][source.col] = temp;

	var tempPos = {row: source.row, col: source.col};
	source.row = target.row;
	source.col = target.col;

	target.row = tempPos.row;
	target.col = tempPos.col;
};

// check if two blocks are adjacent
Match3.Board.prototype.checkAdjacent = function(source, target) {
	var diffRow = Math.abs(source.row - target.row);
	var diffCol = Math.abs(source.col - target.col);
	var isAdjacent = (diffRow === 1 && diffCol === 0) || (diffRow === 0 && diffCol === 1);
	return isAdjacent;
};

// check whether a single block is chained or not
Match3.Board.prototype.isChained = function(block) {
	var isChained = false;
	var row = block.row;
	var col = block.col;
	var variation = this.grid[row][col];

	// left
	if (variation == this.grid[row][col - 1] && variation == this.grid[row][col - 2]) {
		isChained = true;
	}

	// right
	if (variation == this.grid[row][col + 1] && variation == this.grid[row][col + 2]) {
		isChained = true;
	}

	// up
	if (this.grid[row - 2]) {
		if (variation == this.grid[row - 1][col] && variation == this.grid[row - 2][col]) {
			isChained = true;
		}
	}

	// down
	if (this.grid[row + 2]) {
		if (variation == this.grid[row + 1][col] && variation == this.grid[row + 2][col]) {
			isChained = true;
		}
	}

	// center - horizontal
	if (variation == this.grid[row][col - 1] && variation == this.grid[row][col + 1]) {
		isChained = true;
	}

	// center - vertical
	if (this.grid[row + 1] && this.grid[row - 1]) {
		if (variation == this.grid[row + 1][col] && variation == this.grid[row - 1][col]) {
			isChained = true;
		}
	}

	return isChained;

};

// find all the chains
Match3.Board.prototype.findAllChains = function() {
	var chained = [];

	for (var i = 0; i < this.rows; i++) {
		for (var j = 0; j < this.cols; j++) {
			if (this.isChained({row: i, col: j})) {
				chained.push({row: i, col: j});
			}
		}
	}
	console.log(chained);
	return chained;
};

// clear all the chains
Match3.Board.prototype.clearChains = function() {
	// gets all blocks that need to be cleared
	var chainedBlocks = this.findAllChains();

	// set them to zero
	chainedBlocks.forEach(function(block) {
		this.grid[block.row][block.col] = 0;
		
		//kill the block object
		this.state.getBlockFromColRow(block).kill();

	}, this);
};

// drop a block in the main grid from a position to another. the source is set zero
Match3.Board.prototype.dropBlock = function(sourceRow, targetRow, col) {
	this.grid[targetRow][col] = this.grid[sourceRow][col];
	this.grid[sourceRow][col] = 0;

	this.state.dropBlock(sourceRow, targetRow, col);
};

// drop a block in the reserve grid from a position to another. the source is set to zero
Match3.Board.prototype.dropReserveBlock = function(sourceRow, targetRow, col) {
	this.grid[targetRow][col] = this.reserveGrid[sourceRow][col];
	this.reserveGrid[sourceRow][col] = 0;

	this.state.dropReserveBlock(sourceRow, targetRow, col);
};

// move down blocks to fill in empty slots
Match3.Board.prototype.updateGrid = function() {
	var foundBlock;

	// go through all the rows, from the bottom up
	for (var i = this.rows - 1; i >= 0; i--) {
		for (var j = 0; j < this.cols; j++) {

			// if the block is zero, then climb up to get a non-zero one
			if (this.grid[i][j] === 0) {
				foundBlock = false;

				// climb up in the main grid
				for (var k = i - 1; k >= 0; k--) {
					if (this.grid[k][j] > 0) {
						this.dropBlock(k, i, j);
						foundBlock = true;
						break;
					}
				}

				if (!foundBlock) {
					// climb up in the reserve grid
					for (k = this.RESERVE_ROW - 1; k >= 0; k--) {
						if (this.reserveGrid[k][j] > 0) {
							this.dropReserveBlock(k, i, j);
							break;
						}
					}
				}
			}
		}
	}

	// repopulate the reserve
	this.populateReserveGrid();
};
