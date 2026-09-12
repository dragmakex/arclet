"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="panel"><h1>Arclet could not load this view</h1><p>No financial action was submitted. Check setup or retry the read.</p><button onClick={reset}>Retry</button></section>}
