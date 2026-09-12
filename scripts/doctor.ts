import { capabilityStatus } from "../config/runtime";
const status=capabilityStatus();
console.log("Arclet configuration doctor");console.log(`Environment: ${status.environment}`);console.log(`Trading enabled: ${status.tradingEnabled}`);console.log(`Mainnet allowed: ${process.env.ALLOW_MAINNET === "true"}`);
if(status.errors.length)console.error(`Invalid configuration: ${status.errors.join("; ")}`);if(status.missing.length)console.error(`BLOCKED missing: ${status.missing.join(", ")}`);else console.log("Required provider values are present. Run the live probes before enabling trading.");
process.exitCode=status.configured?0:1;
