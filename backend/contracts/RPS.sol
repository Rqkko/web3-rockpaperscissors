// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RPS {
    enum Move { None, Rock, Paper, Scissors }
    enum GameState { WaitingForPlayer, MoveSubmitted, Revealed }

    struct Game {
        address player1;
        address player2;
        uint256 betAmount;
        bytes32 hashedMove1;
        Move move2;
        Move revealedMove1;
        GameState state;
    }

    IERC20 public rpsCoin;
    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;

    event GameCreated(uint256 gameId, address indexed player1, uint256 betAmount);
    event GameEnded(uint256 gameId, address indexed winner, uint256 amountWon, string result);

    constructor(address _rpsCoinAddress) {
        rpsCoin = IERC20(_rpsCoinAddress);
    }

    function initiateGame(
        uint256 amount,
        address opponentAccount,
        uint8 choice,
        string memory secret,
        bytes32 hashedMove,
        uint8 opponentChoice
    ) external returns (address) {
        uint256 gameId = createGame(hashedMove, amount);
        joinGame(gameId, Move(opponentChoice), opponentAccount);

        address winner = reveal(gameId, Move(choice), secret);
        return winner;
    }

    // Player 1 creates a game and commits to a move
    function createGame(bytes32 hashedMove, uint256 amount) public returns (uint256) {
        require(amount > 0, "Bet must be greater than 0");

        // Transfer RPSCoin to contract
        rpsCoin.transferFrom(msg.sender, address(this), amount);

        uint256 gameId = gameIdCounter++;
        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            betAmount: amount,
            hashedMove1: hashedMove,
            move2: Move.None,
            revealedMove1: Move.None,
            state: GameState.WaitingForPlayer
        });

        emit GameCreated(gameId, msg.sender, amount); // Emit the event
        return gameId;
    }

    // Player 2 joins and plays move
    function joinGame(uint256 gameId, Move move, address account) public {
        Game storage game = games[gameId];
        require(game.state == GameState.WaitingForPlayer, "Game not joinable");
        require(move != Move.None, "Invalid move");

        // Transfer matching bet to contract
        rpsCoin.transferFrom(account, address(this), game.betAmount);

        game.player2 = account;
        game.move2 = move;
        game.state = GameState.MoveSubmitted;
    }

    // Player 1 reveals their move and secret
    function reveal(uint256 gameId, Move move, string memory secret) public returns (address) {
        Game storage game = games[gameId];
        require(game.state == GameState.MoveSubmitted, "Cannot reveal yet");
        require(msg.sender == game.player1, "Only player1 can reveal");

        // Verify commitment
        bytes32 hash = keccak256(abi.encodePacked(move, secret));
        require(hash == game.hashedMove1, "Move+secret mismatch");

        game.revealedMove1 = move;
        game.state = GameState.Revealed;

        address winner = determineWinner(game.revealedMove1, game.move2, game.player1, game.player2);
        uint256 totalPot = game.betAmount * 2;

        // Pay winner
        if (winner != address(0)) {
            rpsCoin.transfer(winner, totalPot);
            if (winner == game.player1) {
                emit GameEnded(gameId, game.player1, totalPot, "Player 1 wins!");
                return game.player1;
            } else {
                emit GameEnded(gameId, game.player2, totalPot, "Player 2 wins!");
                return game.player2;
            }
        } else {
            // Draw: refund both
            rpsCoin.transfer(game.player1, game.betAmount);
            rpsCoin.transfer(game.player2, game.betAmount);
            emit GameEnded(gameId, address(0), 0, "Draw! Both players refunded.");
            return address(0);
        }
    }

    function determineWinner(Move move1, Move move2, address player1, address player2) internal pure returns (address) {
        if (move1 == move2) return address(0); // draw

        if (
            (move1 == Move.Rock && move2 == Move.Scissors) ||
            (move1 == Move.Paper && move2 == Move.Rock) ||
            (move1 == Move.Scissors && move2 == Move.Paper)
        ) {
            return player1;
        } else {
            return player2;
        }
    }
}
