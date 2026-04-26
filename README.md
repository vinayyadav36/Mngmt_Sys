# TrustChain-EMS: Secure Evidence Management System

A decentralized application (dApp) for immutable digital evidence records on Ethereum, with IPFS storage and role-based access.

This version is hardened to avoid client-side secret leaks and manual contract wiring.

## What Changed in This Hardened Version

- Pinata secret keys are no longer stored in browser JavaScript.
- File uploads now go through a server-side `/api/uploads/pinata` proxy.
- Contract role registration is no longer self-claimed.
- Admin must approve wallet role first (`Police` or `Court`) before user registration.
- Contract reads are now clean `view` calls.
- Contract ABI/address are loaded dynamically from Truffle artifact and active network.
- No manual contract address/ABI copy-paste is needed after migrate.
- Reproducible Node project setup is added with `package.json`.

## Tech Stack

- Solidity and Truffle
- Ganache (local Ethereum node)
- MetaMask
- IPFS pinning via Pinata (server-side)
- Node.js, Express, Multer
- HTML, CSS, JavaScript frontend

## Prerequisites

- Node.js 20+
- MetaMask
- Ganache (CLI or Desktop)

## Installation

```bash
npm install
```

## Environment Configuration

1. Copy `.env.example` to `.env`
2. Fill in Pinata credentials

Recommended:

```env
PINATA_JWT=your_pinata_jwt
```

Alternative:

```env
PINATA_API_KEY=your_key
PINATA_SECRET_API_KEY=your_secret
```

## Local Run (End-to-End)

1. Start local blockchain (terminal 1):

```bash
npm run chain
```

1. Compile contracts:

```bash
npm run compile
```

1. Deploy contracts:

```bash
npm run migrate:reset
```

1. Start application server (terminal 2):

```bash
npm run serve
```

1. Open:

- <http://127.0.0.1:8080>

## Windows PowerShell Note

If `npm` or `npx` are blocked by execution policy on your machine, use:

```bash
npm.cmd run serve
npm.cmd run chain
```

## Role Approval Flow (New Security Model)

Registration now requires admin role approval first.

- Contract owner is the deployer account (`accounts[0]` in Ganache)
- User cannot self-assign Police/Court role anymore

Approve a user wallet from admin account:

```bash
APPROVE_ADDRESS=0xUserWallet APPROVE_ROLE=Police npm run approve:user
```

Or for court:

```bash
APPROVE_ADDRESS=0xUserWallet APPROVE_ROLE=Court npm run approve:user
```

After approval, that user can connect MetaMask and complete registration in UI.

## Project Scripts

- `npm run chain` - start Ganache on port 7545, chain id 1337
- `npm run compile` - compile contracts
- `npm run migrate` - migrate contracts
- `npm run migrate:reset` - reset and redeploy contracts
- `npm run approve:user` - admin approve a user role
- `npm run serve` - run secure app server

## Security Notes

- Never expose Pinata API secret in frontend code.
- Keep `.env` out of source control.
- Only contract owner can approve onboarding roles.

## Known Next Improvements

- Add on-chain role revocation and ownership transfer UI
- Add automated contract and frontend tests
- Add CI pipeline for compile/lint/smoke checks
- Add per-case read authorization model (optional stricter privacy)
