export function utcDay(epochSeconds: number): string { return new Date(epochSeconds * 1000).toISOString().slice(0, 10); }
export function currentScheduleWindow(startAt: number, everySeconds: number, now: number): number | null { return now < startAt ? null : Math.floor((now - startAt) / everySeconds); }
