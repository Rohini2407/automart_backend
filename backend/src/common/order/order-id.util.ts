/**
 * AM{phone}T{YmdHis} (IST). Only unique to the second — two Buy-Now orders
 * from the same phone in the same second will collide. Same limitation the
 * original PHP had; consider a random suffix or UUID orderId if this ever
 * becomes a real problem at your order volume.
 */
export function generateOrderId(phone: string): string {
  const now = new Date();
  const istMs =
    now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  const ist = new Date(istMs);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp =
    ist.getFullYear().toString() +
    pad(ist.getMonth() + 1) +
    pad(ist.getDate()) +
    pad(ist.getHours()) +
    pad(ist.getMinutes()) +
    pad(ist.getSeconds());

  return `AM${phone}T${stamp}`;
}
