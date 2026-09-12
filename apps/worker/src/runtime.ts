import { CircleCliAdapter, RestrictedProcessRunner } from "@arclet/circle";
export function createCircleAdapter() { const executable=process.env.CIRCLE_CLI_PATH,home=process.env.CIRCLE_HOME;if(!executable||!home)throw new Error("Circle CLI is not configured");return new CircleCliAdapter(new RestrictedProcessRunner(executable,home)); }
