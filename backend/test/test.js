const RPSCoin = artifacts.require("RPSCoin");
const RPS = artifacts.require("RPS");

contract("RPS and RPSCoin", (accounts) => {
    let rpsCoin;
    let rps;
    const [player1, player2] = accounts;

    before(async () => {
        // Deploy RPSCoin and RPS contracts
        rpsCoin = await RPSCoin.new({ from: player1 });
        rps = await RPS.new(rpsCoin.address, { from: player1 });

        // Mint tokens for testing
        await rpsCoin.mint(player1, web3.utils.toWei("100", "ether"), { from: player1 });
        await rpsCoin.mint(player2, web3.utils.toWei("100", "ether"), { from: player1 });
    });

    it("should mint tokens correctly", async () => {
        const balancePlayer1 = await rpsCoin.balanceOf(player1);
        const balancePlayer2 = await rpsCoin.balanceOf(player2);

        assert.equal(web3.utils.fromWei(balancePlayer1, "ether"), "100", "Player 1 should have 100 RPS tokens");
        assert.equal(web3.utils.fromWei(balancePlayer2, "ether"), "100", "Player 2 should have 100 RPS tokens");
    });

    it("should allow player1 to create a game", async () => {
        const betAmount = web3.utils.toWei("10", "ether");
        const move1 = 1; // Rock
        const move2 = 2; // Paper
        const secret = "secret123";
        const hashedMove1 =web3.utils.soliditySha3({ type: "uint8", value: move1 }, { type: "string", value: secret });
        const hashedMove2 =web3.utils.soliditySha3({ type: "uint8", value: move2 }, { type: "string", value: secret });

        // Approve tokens for transfer
        await rpsCoin.approve(rps.address, web3.utils.toBN(betAmount).mul(web3.utils.toBN(2)), { from: player1 });

        // Create game
        const tx1 = await rps.createGame(hashedMove1, betAmount, { from: player1 });
        const tx2 = await rps.createGame(hashedMove2, betAmount, { from: player1 });

        // Extract game IDs from the transaction logs
        const gameId1 = tx1.logs[0].args.gameId.toNumber();
        const gameId2 = tx2.logs[0].args.gameId.toNumber();

        assert.equal(gameId1, 0, "Game ID should be 0");
        assert.equal(gameId2, 1, "Game ID should be 1");
        const game = await rps.games(gameId1);
        assert.equal(game.player1, player1, "Player 1 should be the creator of the game");
        assert.equal(web3.utils.fromWei(game.betAmount, "ether"), "10", "Bet amount should be 10 RPS tokens");
    });

    it("should allow player2 to join the game", async () => {
        const gameId1 = 0;
        const gameId2 = 1;
        const move1 = 2; // Paper
        const move2 = 1; // Rock
        const betAmount = web3.utils.toWei("10", "ether");

        // Approve tokens for transfer
        await rpsCoin.approve(rps.address, web3.utils.toBN(betAmount).mul(web3.utils.toBN(2)), { from: player2 });

        // Join game
        await rps.joinGame(gameId1, move1, { from: player2 });
        await rps.joinGame(gameId2, move2, { from: player2 });

        const game1 = await rps.games(gameId1);
        const game2 = await rps.games(gameId2);
        assert.equal(game1.player2, player2, "Player 2 should have joined the game1");
        assert.equal(game2.player2, player2, "Player 2 should have joined the game2");
        assert.equal(game1.move2.toString(), "2", "Player 2's move should be Paper in game 1");
        assert.equal(game2.move2.toString(), "1", "Player 2's move should be Rock in game 2");
    });

    it("should allow player1 to reveal their move and determine the winner", async () => {
        const gameId1 = 0;
        const gameId2 = 1;
        const move1 = 1; // Rock
        const move2 = 2; // Paper
        const secret = "secret123";

        // Reveal move
        const tx1 = await rps.reveal(gameId1, move1, secret, { from: player1 });
        const tx2 = await rps.reveal(gameId2, move2, secret, { from: player1 });
        const result1 = tx1.logs[0].args.result;
        const result2 = tx2.logs[0].args.result;
        const winner1 = tx1.logs[0].args.winner;
        const winner2 = tx2.logs[0].args.winner;
        const amountWon1 = tx1.logs[0].args.amountWon;
        const amountWon2 = tx2.logs[0].args.amountWon;

        const game1 = await rps.games(gameId1);
        const game2 = await rps.games(gameId2);
        assert.equal(game1.state.toString(), "2", "Game state should be Revealed");
        assert.equal(game2.state.toString(), "2", "Game state should be Revealed");

        assert.equal(winner1, player2, "Player 2 should be the winner for game1 (Paper beats Rock)");
        assert.equal(web3.utils.fromWei(amountWon1, "ether"), "20", "Player 2 should win 20 RPS tokens");
        assert.equal(result1, "Player 2 wins!", "Player 2 should be the winner for game2 (Paper beats Rock)");

        assert.equal(winner2, player1, "Player 1 should be the winner for game2 (Paper beats Rock)");
        assert.equal(web3.utils.fromWei(amountWon2, "ether"), "20", "Player 1 should win 20 RPS tokens");
        assert.equal(result2, "Player 1 wins!", "Player 1 should be the winner for game2 (Paper beats Rock)");
    });
});