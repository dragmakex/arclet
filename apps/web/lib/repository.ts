import postgres, { type Sql } from "postgres";
import { canonicalHash, mandateApprovalSchema, mandateDomain, mandateTypes, randomNonce, strategyIdHash, validateStrategySafety, verifyMandateSignature, verifyWithdrawalSignature, withdrawalApprovalSchema, withdrawalTypes, type StrategySpec } from "@arclet/domain";
import { encodeFunctionData, getAddress } from "viem";
import { ARC_USDC, createArcClient, erc20Abi, verifyErc20Transfer } from "@arclet/chain";
import { runtimeSafetyLimits } from "../../../config/runtime";
import markets from "../../../config/markets.json";
import type { AuthenticatedUser } from "./auth";

type Database = Sql<Record<string, never>>;
const globalDatabase = globalThis as typeof globalThis & { arcletSql?: Database };
export function database(): Database {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  return globalDatabase.arcletSql ??= postgres(process.env.DATABASE_URL, { max: 8, idle_timeout: 20 });
}
function allowlisted(userId: string): boolean { return (process.env.DEMO_USER_ALLOWLIST ?? "").split(",").map((value) => value.trim()).filter(Boolean).includes(userId); }
export async function ensureUser(identity: AuthenticatedUser) {
  if (!allowlisted(identity.privyUserId)) throw new Error("USER_NOT_INVITED");
  const rows = await database()<[{ id: string; embedded_wallet_address: string; access_status: string }]>`INSERT INTO users (privy_user_id,embedded_wallet_address,access_status) VALUES (${identity.privyUserId},${identity.embeddedWalletAddress},'invited') ON CONFLICT (privy_user_id) DO UPDATE SET embedded_wallet_address=EXCLUDED.embedded_wallet_address RETURNING id,embedded_wallet_address,access_status`;
  return rows[0]!;
}
export async function assignedWallet(userId: string) {
  const rows = await database()<[{ id: string; address: string; circle_wallet_id: string }]>`SELECT id,address,circle_wallet_id FROM trading_wallets WHERE user_id=${userId} AND assignment_status='assigned' LIMIT 1`;
  return rows[0] ?? null;
}
export async function claimWallet(userId: string) {
  return database().begin(async (tx) => {
    const existing = await tx<[{ id: string; address: string; circle_wallet_id: string }]>`SELECT id,address,circle_wallet_id FROM trading_wallets WHERE user_id=${userId} LIMIT 1`;
    if (existing[0]) return existing[0];
    const available = await tx<[{ id: string }]>`SELECT id FROM trading_wallets WHERE user_id IS NULL AND assignment_status='available' AND chain_id=5042002 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!available[0]) throw new Error("WALLET_CAPACITY");
    const assigned = await tx<[{ id: string; address: string; circle_wallet_id: string }]>`UPDATE trading_wallets SET user_id=${userId},assignment_status='assigned',operating_mode='frozen' WHERE id=${available[0].id} RETURNING id,address,circle_wallet_id`;
    return assigned[0]!;
  });
}
function enabledMarket(spec: StrategySpec) {
  const market = markets.markets.find((item) => item.id === spec.marketId);
  if (!market?.enabled || !("marketConfigHash" in market) || market.marketConfigHash !== spec.marketConfigHash) throw new Error("UNSUPPORTED_MARKET");
  return market;
}
export async function createStrategyDraft(userId: string, originalInstruction: string, rawSpec: unknown) {
  const spec = validateStrategySafety(rawSpec, Math.floor(Date.now() / 1000), runtimeSafetyLimits()); enabledMarket(spec);
  const wallet = await assignedWallet(userId); if (!wallet) throw new Error("WALLET_REQUIRED");
  const canonical = JSON.parse(JSON.stringify(spec)), hash = canonicalHash(canonical);
  return database().begin(async (tx) => {
    const strategies = await tx<[{ id: string }]>`INSERT INTO strategies (user_id,trading_wallet_id,state) VALUES (${userId},${wallet.id},'DRAFT') RETURNING id`;
    const strategyId = strategies[0]!.id;
    await tx`INSERT INTO strategy_versions (strategy_id,version,original_instruction,canonical_spec,spec_hash,market_config_hash) VALUES (${strategyId},1,${originalInstruction},${tx.json(canonical)},${hash},${spec.marketConfigHash})`;
    return { id: strategyId, version: 1, spec, strategyHash: hash };
  });
}
export async function getStrategy(userId: string, strategyId: string) {
  const rows = await database()<[{ id: string; state: string; current_version: number; authorization_epoch: string; canonical_spec: StrategySpec; spec_hash: `0x${string}`; market_config_hash: `0x${string}`; trading_wallet_address: string }]>`SELECT s.id,s.state,s.current_version,s.authorization_epoch::text,v.canonical_spec,v.spec_hash,v.market_config_hash,w.address AS trading_wallet_address FROM strategies s JOIN strategy_versions v ON v.strategy_id=s.id AND v.version=s.current_version JOIN trading_wallets w ON w.id=s.trading_wallet_id WHERE s.id=${strategyId} AND s.user_id=${userId}`;
  if (!rows[0]) throw new Error("NOT_FOUND"); return rows[0];
}
export async function createMandateChallenge(userId: string, owner: string, strategyId: string, origin: string) {
  const strategy = await getStrategy(userId, strategyId);
  if (strategy.state !== "DRAFT" && strategy.state !== "AWAITING_SIGNATURE") throw new Error("STATE_CONFLICT");
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = randomNonce();
  const approval = mandateApprovalSchema.parse({
    owner,
    tradingWallet: strategy.trading_wallet_address,
    strategyId: strategyIdHash(strategy.id),
    strategyVersion: BigInt(strategy.current_version),
    strategyHash: strategy.spec_hash,
    marketConfigHash: strategy.market_config_hash,
    nonce,
    issuedAt: BigInt(issuedAt),
    expiresAt: BigInt(strategy.canonical_spec.expiresAt)
  });
  const wire = { ...approval, strategyVersion: approval.strategyVersion.toString(), issuedAt: approval.issuedAt.toString(), expiresAt: approval.expiresAt.toString() };
  return database().begin(async (tx) => {
    // Only one current challenge may activate this version. Older unused challenges
    // are explicitly revoked so a user cannot race two signatures for one mandate.
    await tx`UPDATE authorizations SET revoked_at=now() WHERE user_id=${userId} AND purpose='mandate' AND consumed_at IS NULL AND revoked_at IS NULL AND typed_message->>'strategyId'=${strategyIdHash(strategy.id)}`;
    const authorization = await tx<[{ id: string }]>`INSERT INTO authorizations (purpose,user_id,nonce,typed_message,message_hash,challenge_expires_at,mandate_expires_at) VALUES ('mandate',${userId},${nonce},${tx.json(wire)},${canonicalHash(wire)},to_timestamp(${issuedAt + 300}),to_timestamp(${strategy.canonical_spec.expiresAt})) RETURNING id`;
    await tx`UPDATE strategies SET state='AWAITING_SIGNATURE' WHERE id=${strategyId} AND user_id=${userId} AND state IN ('DRAFT','AWAITING_SIGNATURE')`;
    return { challengeId: authorization[0]!.id, domain: mandateDomain(5042002, origin), types: mandateTypes, primaryType: "MandateApproval" as const, message: wire, challengeExpiresAt: issuedAt + 300 };
  });
}
export async function activateMandate(userId: string, owner: string, strategyId: string, challengeId: string, signature: `0x${string}`, origin: string) {
  const strategy = await getStrategy(userId, strategyId);
  const challengeRows = await database()<[{ id: string; typed_message: unknown; consumed_at: Date | null; revoked_at: Date | null; challenge_expires_at: Date; nonce: string }]>`SELECT id,typed_message,consumed_at,revoked_at,challenge_expires_at,nonce FROM authorizations WHERE id=${challengeId} AND user_id=${userId} AND purpose='mandate'`;
  const challenge = challengeRows[0]; if (!challenge || challenge.consumed_at || challenge.revoked_at || challenge.challenge_expires_at.getTime() <= Date.now()) throw new Error("CHALLENGE_EXPIRED");
  const approval = mandateApprovalSchema.parse(challenge.typed_message);
  if (approval.strategyId !== strategyIdHash(strategyId) || approval.strategyHash !== strategy.spec_hash || approval.marketConfigHash !== strategy.market_config_hash || Number(approval.strategyVersion) !== strategy.current_version || Number(approval.expiresAt) !== strategy.canonical_spec.expiresAt) throw new Error("APPROVAL_MISMATCH");
  if (!await verifyMandateSignature({ approval, signature, chainId: 5042002, origin, expectedOwner: owner })) throw new Error("INVALID_SIGNATURE");
  validateStrategySafety(strategy.canonical_spec, Math.floor(Date.now() / 1000), runtimeSafetyLimits()); enabledMarket(strategy.canonical_spec);
  return database().begin(async (tx) => {
    // Serialize activation by trading wallet. The check is deliberately inside the
    // lock so two different strategy challenges cannot create two active mandates.
    const locked = await tx<[{ trading_wallet_id: string }]>`SELECT trading_wallet_id FROM strategies WHERE id=${strategyId} AND user_id=${userId} FOR UPDATE`;
    if (!locked[0]) throw new Error("NOT_FOUND");
    const otherActive = await tx<[{ id: string }]>`SELECT id FROM strategies WHERE trading_wallet_id=${locked[0].trading_wallet_id} AND state='ACTIVE' AND id<>${strategyId} LIMIT 1`;
    if (otherActive[0]) throw new Error("STATE_CONFLICT");
    const consumed = await tx`UPDATE authorizations SET signature=${signature},consumed_at=now() WHERE id=${challengeId} AND consumed_at IS NULL AND revoked_at IS NULL AND challenge_expires_at>now() RETURNING id`;
    if (!consumed[0]) throw new Error("NONCE_REPLAY");
    const active = await tx`UPDATE strategies SET state='ACTIVE',authorization_epoch=authorization_epoch+1,next_evaluation_at=now() WHERE id=${strategyId} AND user_id=${userId} AND current_version=${strategy.current_version} AND state='AWAITING_SIGNATURE' RETURNING id,state,authorization_epoch`;
    if (!active[0]) throw new Error("STATE_CONFLICT");
    await tx`INSERT INTO jobs (type,payload,dedupe_key,scheduled_at) VALUES ('EVALUATE',${tx.json({ strategyId })},${`evaluate:${strategyId}:${strategy.current_version}`},now()) ON CONFLICT (dedupe_key) DO NOTHING`;
    return active[0];
  });
}
export async function pauseStrategy(userId: string, strategyId: string) {
  return database().begin(async (tx) => {
    const rows = await tx`UPDATE strategies SET state='PAUSED',authorization_epoch=authorization_epoch+1,pause_reason='user_requested' WHERE id=${strategyId} AND user_id=${userId} AND state IN ('ACTIVE','PAUSED') RETURNING id,state,authorization_epoch`;
    if (!rows[0]) throw new Error("NOT_FOUND");
    await tx`UPDATE jobs SET terminal=true WHERE terminal=false AND type IN ('EVALUATE','SUBMIT') AND payload->>'strategyId'=${strategyId}`;
    return rows[0];
  });
}
export async function resumeStrategy(userId: string, owner: string, strategyId: string) {
  const rows = await database()`UPDATE strategies SET state='ACTIVE',pause_reason=NULL,next_evaluation_at=now() WHERE id=${strategyId} AND user_id=${userId} AND state='PAUSED' AND EXISTS (SELECT 1 FROM authorizations a JOIN strategy_versions v ON v.strategy_id=strategies.id AND v.version=strategies.current_version WHERE a.user_id=strategies.user_id AND a.purpose='mandate' AND a.consumed_at IS NOT NULL AND a.revoked_at IS NULL AND a.mandate_expires_at>now() AND a.typed_message->>'strategyHash'=v.spec_hash AND a.typed_message->>'owner'=${getAddress(owner)}) RETURNING id,state,authorization_epoch`;
  if (!rows[0]) throw new Error("STATE_CONFLICT"); return rows[0];
}
export async function createFundingIntent(userId: string, source: string, amountAtomic: string) {
  const wallet = await assignedWallet(userId); if (!wallet) throw new Error("WALLET_REQUIRED"); const expiresAt = new Date(Date.now() + 5 * 60_000);
  const rows = await database()<[{ id: string }]>`INSERT INTO funding_intents (user_id,source_address,destination_address,chain_id,token_address,amount_atomic,expires_at) VALUES (${userId},${getAddress(source)},${getAddress(wallet.address)},5042002,${ARC_USDC},${amountAtomic},${expiresAt}) RETURNING id`;
  return { id: rows[0]!.id, expiresAt: Math.floor(expiresAt.getTime()/1000), transaction: { chainId: 5042002, to: ARC_USDC, value: "0", data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [getAddress(wallet.address), BigInt(amountAtomic)] }) }, destination: getAddress(wallet.address) };
}
export async function confirmFundingIntent(userId: string, intentId: string, hash: `0x${string}`) {
  const intents = await database()<[{ id: string; source_address: string; destination_address: string; token_address: string; amount_atomic: string; status: string; expires_at: Date }]>`SELECT id,source_address,destination_address,token_address,amount_atomic,status,expires_at FROM funding_intents WHERE id=${intentId} AND user_id=${userId}`;
  const intent = intents[0]; if (!intent) throw new Error("NOT_FOUND"); if (intent.status === "confirmed") return { id: intent.id, status: "confirmed" }; if (intent.expires_at.getTime() <= Date.now()) throw new Error("INTENT_EXPIRED");
  const receipt = await createArcClient(process.env.ARC_RPC_URL).getTransactionReceipt({ hash });
  const movement = verifyErc20Transfer(receipt, { token: intent.token_address, from: intent.source_address, to: intent.destination_address, amount: BigInt(intent.amount_atomic) });
  const receiptKey = `5042002:${movement.transactionHash}:${movement.logIndex}`;
  const rows = await database()`UPDATE funding_intents SET status='confirmed',receipt_key=${receiptKey} WHERE id=${intent.id} AND status='pending' RETURNING id,status,receipt_key`;
  if (!rows[0]) throw new Error("RECEIPT_REUSED"); return rows[0];
}
export async function createWithdrawalChallenge(userId: string, owner: string, assetId: string, amountAtomic: string, origin: string) {
  const wallet = await assignedWallet(userId);
  if (!wallet) throw new Error("WALLET_REQUIRED");
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = randomNonce();
  const approval = withdrawalApprovalSchema.parse({ owner, tradingWallet: wallet.address, destination: owner, assetId, amountAtomic, chainId: 5042002, nonce, issuedAt, expiresAt: issuedAt + 300 });
  const wire = { ...approval, amountAtomic: approval.amountAtomic.toString(), chainId: approval.chainId.toString(), issuedAt: approval.issuedAt.toString(), expiresAt: approval.expiresAt.toString() };
  return database().begin(async (tx) => {
    // There is one outstanding withdrawal authorization per wallet. Replacing it
    // prevents a previously displayed amount from being signed later.
    await tx`UPDATE authorizations SET revoked_at=now() WHERE user_id=${userId} AND purpose='withdrawal' AND consumed_at IS NULL AND revoked_at IS NULL AND typed_message->>'tradingWallet'=${wallet.address}`;
    const rows = await tx<[{ id: string }]>`INSERT INTO authorizations (purpose,user_id,nonce,typed_message,message_hash,challenge_expires_at,mandate_expires_at) VALUES ('withdrawal',${userId},${nonce},${tx.json(wire)},${canonicalHash(wire)},to_timestamp(${issuedAt + 300}),to_timestamp(${issuedAt + 300})) RETURNING id`;
    return { challengeId: rows[0]!.id, domain: mandateDomain(5042002, origin), types: withdrawalTypes, primaryType: "WithdrawalApproval" as const, message: wire };
  });
}
export async function submitWithdrawal(userId:string,owner:string,challengeId:string,signature:`0x${string}`,origin:string){
  const challenges=await database()<[{typed_message:unknown;consumed_at:Date|null;revoked_at:Date|null;challenge_expires_at:Date}]>`SELECT typed_message,consumed_at,revoked_at,challenge_expires_at FROM authorizations WHERE id=${challengeId} AND user_id=${userId} AND purpose='withdrawal'`;const challenge=challenges[0];if(!challenge||challenge.consumed_at||challenge.revoked_at||challenge.challenge_expires_at.getTime()<=Date.now())throw new Error("CHALLENGE_EXPIRED");
  const approval=withdrawalApprovalSchema.parse(challenge.typed_message);if(!await verifyWithdrawalSignature({approval,signature,origin,expectedOwner:owner}))throw new Error("INVALID_SIGNATURE");
  const wallet=await assignedWallet(userId);if(!wallet||getAddress(wallet.address)!==approval.tradingWallet)throw new Error("APPROVAL_MISMATCH");
  return database().begin(async(tx)=>{const consumed=await tx`UPDATE authorizations SET signature=${signature},consumed_at=now() WHERE id=${challengeId} AND consumed_at IS NULL AND revoked_at IS NULL AND challenge_expires_at>now() RETURNING id`;if(!consumed[0])throw new Error("NONCE_REPLAY");await tx`UPDATE strategies SET state='PAUSED',authorization_epoch=authorization_epoch+1,pause_reason='withdrawal_requested' WHERE user_id=${userId} AND trading_wallet_id=${wallet.id} AND state='ACTIVE'`;const rows=await tx<[{id:string}]>`INSERT INTO withdrawals (user_id,wallet_id,destination_address,asset_id,amount_atomic,authorization_id,state) VALUES (${userId},${wallet.id},${approval.destination},${approval.assetId},${approval.amountAtomic.toString()},${challengeId},'AUTHORIZED') RETURNING id`;await tx`INSERT INTO jobs (type,payload,dedupe_key,scheduled_at) VALUES ('WITHDRAWAL',${tx.json({withdrawalId:rows[0]!.id})},${`withdrawal:${rows[0]!.id}`},now())`;return {id:rows[0]!.id,state:"AUTHORIZED"};});
}
