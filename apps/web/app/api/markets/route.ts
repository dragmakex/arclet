import registry from "../../../../../config/markets.json";
export function GET() { return Response.json({ environment: "arc-testnet", markets: registry.markets }); }
