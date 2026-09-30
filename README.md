# ProofNote

A mobile friendly Ethereum DApp that signs short statements with a wallet and creates links anyone can verify. Optional onchain anchoring sends the statement's Keccak-256 fingerprint as transaction input data in a 0 ETH transfer to the same wallet. The signature flow uses no server, account registration, wallet seed phrase or gas. **A signature proves control of an address, not the truth of a claim.** An anchor transaction is only submitted when the user chooses it and may still be pending or fail; the viewer should inspect the transaction on a block explorer.

## Files and local preview

This is plain static HTML, CSS and JavaScript. `vendor/ethers.umd.min.js` is a local copy of ethers.js 6.17.0 (MIT licensed; see `vendor/LICENSE.md`). No npm install or build is required.

```bash
cd proofnote
python3 -m http.server 8000
```

Visit `http://localhost:8000`. On a computer, use an Ethereum wallet extension. On a phone, open the deployed Render link inside the MetaMask app's in-app browser. Use a test wallet; never enter a recovery phrase on this site. To demonstrate without testnet funds: Connect wallet → Write → Sign → Copy proof link → Verify proof. The optional anchor costs testnet or mainnet gas depending on the selected network.

## Render deployment

1. Create a **new GitHub repository**, such as `proofnote-dapp`, and upload **all contents of this folder**, with `index.html` at the repository root. Upload `vendor/ethers.umd.min.js` as well.
2. In Render, choose **New → Static Site**, connect GitHub and select that repository.
3. Set **Build Command** to `echo Ready` and **Publish Directory** to `.`. No environment variables are needed. Select the free plan if offered, then **Deploy Static Site**.
4. Open the resulting `https://...onrender.com` URL on a computer and on a phone. For phone signing, open it in the MetaMask app's browser. Send **the Render URL** to your teacher by 8:30 pm (confirm the intended date/time with the class).

The app loads on a phone even without a wallet; connecting and signing requires a compatible wallet. For an optional onchain demonstration, select a network with test funds, click **Anchor hash onchain**, then copy the proof link again. Verify the transaction on the block explorer for that network by comparing its `input data` to the hash displayed in the signed proof's anchor fields.

## Security and privacy

The content and signature are embedded in the URL fragment; anyone with the link can read them. Do not put secrets in a statement. Verification recovers an Ethereum address locally with `ethers.verifyMessage`; it does not contact a server or validate the identity of the person behind the wallet. An optional anchor is a separate onchain transaction; signing alone is not onchain storage.
