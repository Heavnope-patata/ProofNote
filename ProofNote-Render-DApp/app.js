/* ProofNote: wallet signed, client verified statements. No private keys or backend. */
const $ = id => document.getElementById(id);
const PREFIX = 'ProofNote statement v1\n';
let account = null;
let currentProof = null;
const createStatus = (message, error = false) => setStatus('createStatus', message, error);
function setStatus(id, message, error = false) { const el = $(id); el.textContent = message; el.classList.toggle('error', error); }
function friendlyError(err) { return err?.code === 4001 || err?.code === 'ACTION_REJECTED' ? 'Request cancelled in wallet.' : (err?.shortMessage || err?.message || String(err)).slice(0, 230); }
function setTab(mode) { for (const name of ['create','verify']) { $(name+'Panel').classList.toggle('hidden', name !== mode); $(name+'Tab').classList.toggle('active', name === mode); } }
function updateWallet(address) { account = address; $('walletPill').textContent = address ? address.slice(0,6)+'…'+address.slice(-4) : 'Wallet disconnected'; $('walletPill').classList.toggle('connected', !!address); $('connectBtn').textContent = address ? 'Wallet connected' : 'Connect wallet'; updateSign(); }
function updateSign() { $('count').textContent = `${$('statement').value.length} / 500`; $('signBtn').disabled = !account || !$('statement').value.trim(); }
async function connect() {
  if (!window.ethereum) { createStatus('No wallet found. On a phone, open this page inside the MetaMask app browser; on a computer, install a compatible Ethereum wallet.', true); return; }
  try { const accounts = await window.ethereum.request({ method:'eth_requestAccounts' }); updateWallet(accounts[0] || null); createStatus(account ? 'Connected. Write and sign your statement.' : 'No account selected.'); }
  catch (err) { createStatus(friendlyError(err), true); }
}
function encodeProof(obj) { return btoa(Array.from(new TextEncoder().encode(JSON.stringify(obj)), b => String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function decodeProof(encoded) { const bytes = Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-encoded.length%4)%4)), c => c.charCodeAt(0)); return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
function proofUrl(proof) { return `${location.origin}${location.pathname}#proof=${encodeProof(proof)}`; }
function validateProof(proof) {
  if (!proof || proof.version !== 1 || typeof proof.text !== 'string' || !proof.text.trim() || proof.text.length > 500 || typeof proof.address !== 'string' || !ethers.isAddress(proof.address) || typeof proof.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(proof.signature)) throw new Error('Invalid or incomplete proof.');
  const recovered = ethers.verifyMessage(PREFIX + proof.text, proof.signature);
  if (recovered.toLowerCase() !== proof.address.toLowerCase()) throw new Error('Signature does not match the statement and wallet address.');
  return recovered;
}
async function sign() {
  const text = $('statement').value.trim(); if (!text || text.length > 500 || !account) return;
  $('signBtn').disabled = true; createStatus('Waiting for wallet signature…');
  try {
    const message = PREFIX + text;
    const signedAddress = account;
    const signature = await window.ethereum.request({ method:'personal_sign', params:[ethers.hexlify(ethers.toUtf8Bytes(message)), signedAddress] });
    const proof = { version:1, text, address:signedAddress, signature };
    validateProof(proof);
    currentProof = proof;
    $('signedBy').textContent = signedAddress;
    $('result').classList.remove('hidden');
    $('anchorStatus').textContent = '';
    createStatus('Signed successfully. Share the link to let others verify.');
  } catch (err) { createStatus(friendlyError(err), true); } finally { updateSign(); }
}
async function copyLink() {
  if (!currentProof) return;
  const url = proofUrl(currentProof);
  try { await navigator.clipboard.writeText(url); $('copyBtn').textContent = 'Copied!'; setTimeout(()=>$('copyBtn').textContent='Copy proof link', 2200); }
  catch { $('proofLink').value = url; setTab('verify'); setStatus('verifyStatus','Copy the link from the field above.'); }
}
async function anchor() {
  if (!currentProof || !window.ethereum) return;
  const digest = ethers.id(PREFIX + currentProof.text);
  setStatus('anchorStatus','Confirm the transaction in your wallet. This costs network gas.');
  $('anchorBtn').disabled = true;
  try {
    const from = (await window.ethereum.request({method:'eth_accounts'}))[0];
    if (!from || from.toLowerCase() !== currentProof.address.toLowerCase()) throw new Error('Reconnect the wallet that signed this statement.');
    const chainId = await window.ethereum.request({method:'eth_chainId'});
    const tx = await window.ethereum.request({method:'eth_sendTransaction',params:[{from,to:from,value:'0x0',data:digest}]});
    currentProof = {...currentProof, anchor:{chainId, tx, digest}};
    setStatus('anchorStatus','Transaction submitted. Copy the proof link again to include the transaction ID. The recipient can inspect the transaction data on a block explorer.');
  } catch (err) { setStatus('anchorStatus',friendlyError(err),true); } finally { $('anchorBtn').disabled = false; }
}
function proofFromInput(input) { const raw = input.trim(); const hash = raw.includes('#proof=') ? raw.split('#proof=')[1] : raw.replace(/^#?proof=/,''); if (!hash || hash.length > 5000) throw new Error('Paste a valid ProofNote link.'); return decodeProof(hash); }
function addRow(parent,label,value) { const box=document.createElement('div');box.className='data';const small=document.createElement('small');small.textContent=label;const code=document.createElement('code');code.textContent=value;box.append(small,code);parent.append(box); }
function verify() {
  const box=$('verification'); box.replaceChildren(); box.classList.add('hidden');box.classList.remove('bad');
  try {
    const proof=proofFromInput($('proofLink').value); const recovered=validateProof(proof);
    const header=document.createElement('div');header.className='resultheader';header.textContent='✓ Valid wallet signature';box.append(header);
    const p=document.createElement('p');p.textContent='This exact statement was signed by the wallet below.';box.append(p);
    const quote=document.createElement('blockquote');quote.className='prooftext';quote.textContent=proof.text;box.append(quote);
    addRow(box,'Wallet address',recovered);
    if (proof.anchor) {
      if (typeof proof.anchor.digest !== 'string' || proof.anchor.digest.toLowerCase() !== ethers.id(PREFIX + proof.text).toLowerCase() || !/^0x[0-9a-fA-F]{64}$/.test(proof.anchor.tx || '')) throw new Error('The attached anchor data does not match this statement.');
      addRow(box,'Claimed onchain transaction (inspect its status and input data independently)',proof.anchor.tx);
      addRow(box,'Chain ID',String(parseInt(proof.anchor.chainId,16)));
    }
    box.classList.remove('hidden');setStatus('verifyStatus','Verification completed in your browser.');
  } catch (err) { box.classList.add('bad');setStatus('verifyStatus',friendlyError(err),true); }
}
$('createTab').onclick=()=>setTab('create');$('verifyTab').onclick=()=>setTab('verify');
$('statement').oninput=()=>{ updateSign(); currentProof=null; $('result').classList.add('hidden'); };
$('connectBtn').onclick=connect;$('signBtn').onclick=sign;$('copyBtn').onclick=copyLink;$('anchorBtn').onclick=anchor;$('verifyBtn').onclick=verify;
if (window.ethereum?.on) window.ethereum.on('accountsChanged',accounts=>{updateWallet(accounts[0]||null);currentProof=null;$('result').classList.add('hidden');});
if (location.hash.startsWith('#proof=')) { $('proofLink').value=location.href;setTab('verify');verify(); }
if (window.ethereum) window.ethereum.request({method:'eth_accounts'}).then(a=>updateWallet(a[0]||null)).catch(()=>{});
