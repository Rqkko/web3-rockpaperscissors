import { useEffect, useState } from "react";
import "./App.css";
import web3 from "./utils/web3";
import { rps, rpsCoin } from "./utils/contracts";

function App() {
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [botChoice, setBotChoice] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [bet, setBet] = useState<number>(0);
  
  const [account, setAccount] = useState<string>("");
  const [botAccount, setBotAccount] = useState<string>("");
  const [balance, setBalance] = useState<number>(0); // Initial balance
  const [botBalance, setBotBalance] = useState<number>(0); // Bot's balance

  const choices = ["none", "rock", "paper", "scissors"];

  async function initializeAccounts() {
    if (!web3) {
      alert("Please install MetaMask");
      return;
    }

    const accounts = await window.ethereum?.request({ method: "eth_requestAccounts" }) as string[];
    if (!accounts || accounts.length === 0) {
      alert("No accounts found. Please connect your wallet.");
      return;
    }

    setAccount(accounts[0]);
    setBotAccount(accounts[1]);
  }

  function updateBalance() {
    if (account) {
      rpsCoin.methods.balanceOf(account).call<number>()
      .then((bal) => {
        if (bal) {
          setBalance(Number(web3?.utils.fromWei(bal.toString(), "ether")));
        }
      });
    }
    
    if (botAccount) {
      rpsCoin.methods.balanceOf(botAccount).call<number>()
      .then((botBal) => {
        if (botBal) {
          setBotBalance(Number(web3?.utils.fromWei(botBal.toString(), "ether")));
        }
      });
    }
  }

  function generateSecret(length: number): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function playGame(choice: number) {
    if (bet <= 0 || bet > balance) {
      setResult("Invalid bet amount!");
      return;
    }

    if (bet > botBalance) {
      setResult("Bet exceeds bot's balance!");
      return;
    }

    const botRandomChoice = Math.floor(Math.random() * (choices.length-1)) + 1;
    console.log("Bot's choice:", botRandomChoice);

    const amount = web3?.utils.toWei(bet.toString(), "ether"); // Convert bet to Wei

    // Approve the bet amount
    await rpsCoin.methods.approve(rps.options.address, amount).send({ from: account });
    await rpsCoin.methods.approve(rps.options.address, amount).send({ from: botAccount });
    // console.log("Done");
    // return;

    const secret = generateSecret(16);
    const hash = web3?.utils.soliditySha3({ type: "uint8", value: choice }, { type: "string", value: secret })

    // const cgTx = await rps.methods.createGame(hash, amount).send({ from: account });
    // const gameId = cgTx.events?.GameCreated?.returnValues?.gameId as number;
    // console.log("Game ID:", gameId);
    
    // await rps.methods.joinGame(gameId, botRandomChoice).send({ from: botAccount });
    // console.log("Bot joined the game");
    
    // const revealTx = await rps.methods.reveal(parseInt(gameId.toString()), choice, secret).send({ from: account });
    // const result = revealTx.events?.GameEnded?.returnValues;
    // const resultGameId = result?.gameId as number;
    // const winner = result?.winner as string;

    const tx = await rps.methods.initiateGame(amount, botAccount, choice, secret, hash, botRandomChoice).send({ from: account });
    console.log("Game initiated");

    const gameEndedEvent = tx.events?.GameEnded?.returnValues;

    if (!gameEndedEvent) {
      alert("Game ended event not found.");
      return;
    }
    const gameId = gameEndedEvent.gameId as number;
    const winner = gameEndedEvent.winner as string;
    const amountWon = gameEndedEvent.amountWon as number;
    const result = gameEndedEvent.result as string;

    // if (gameId != resultGameId) {
    //   alert("Game ID mismatch. Please try again.");
    //   return
    // }

    console.log("Game ID:", gameId);
    console.log("Winner:", winner);
    console.log("Result:", result);
    console.log("Amount Won:", amountWon);

    if (winner.toLowerCase() == account) {
      setResult("You win!");
      console.log("Winner: You");
    } else if (winner.toLowerCase() == botAccount) {
      setResult("You lose!");
      console.log("Winner: Bot");
    } else {
      setResult("It's a draw!");
      console.log("Winner: Draw");
    }

    updateBalance();
    setUserChoice(choice);
    setBotChoice(botRandomChoice);
  };

  function resetGame() {
    setUserChoice(null);
    setBotChoice(null);
    setResult(null);
    setBet(0);
  };

  useEffect(() => {
    if (!web3) {
      alert("There is no web3 provider. Please install MetaMask.");
      return;
    }
    initializeAccounts()
  }, []);

  useEffect(() => {
    if (account) {
      console.log(account);
      rpsCoin.methods.balanceOf(account).call<number>()
      .then((bal) => {
        if (bal) {
          setBalance(Number(web3?.utils.fromWei(bal.toString(), "ether")));
        }
      });
    }
  }, [account]);
  
  useEffect(() => {
    if (botAccount) {
      rpsCoin.methods.balanceOf(botAccount).call<number>()
      .then((botBal) => {
        if (botBal) {
          setBotBalance(Number(web3?.utils.fromWei(botBal.toString(), "ether")));
        }
      })
    }
  }, [botAccount]);

  if (balance <= 0) {
    return (
      <div className="App">
        <h1>Rock Paper Scissors</h1>
        <p>You are out of money. Game over!</p>
        <button onClick={resetGame}>Restart Game</button>
      </div>
    );
  }

  if (botBalance <= 0) {
    return (
      <div className="App">
        <h1>Rock Paper Scissors</h1>
        <p>The bot is out of money. You win the game!</p>
        <button onClick={resetGame}>Restart Game</button>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Rock Paper Scissors</h1>
      <p>Your Balance: ${balance}</p>
      <p>Bot's Balance: ${botBalance}</p>
      <div>
        <label>
          Bet Amount: $
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="choices">
        {choices.slice(1).map((choice, index) => (
          <button key={choice} onClick={() => playGame(index + 1)}>
            {choice}
          </button>
        ))}
      </div>
      {userChoice && botChoice && (
        <div className="results">
          <p>You chose: {choices[userChoice]}</p>
          <p>Bot chose: {choices[botChoice]}</p>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App;