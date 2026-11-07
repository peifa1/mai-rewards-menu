// Loads the self-contained Birthday Wheel scene (public/birthday_wheel.html).

let cached: string | null = null;
let pending: Promise<string> | null = null;

export async function loadBirthdayWheelTemplate(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch("/birthday_wheel.html");
    if (!res.ok) throw new Error(`Failed to load Birthday Wheel template: ${res.status}`);
    const html = await res.text();
    cached = html;
    return html;
  })();
  return pending;
}
