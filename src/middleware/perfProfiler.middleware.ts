import { Request, Response, NextFunction } from "express";

// Vaqtinchalik perf profiler (audit uchun). Tezligi 100ms'dan yuqori
// so'rovlar belgilab chiqiladi. Hisobot tugagach o'chiriladi yoki
// scripts/diagnostics/ ga ko'chiriladi.
export const perfProfiler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = process.hrtime.bigint();
  (req as any)._perfMarks = [{ label: "start", t: start }];

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const totalMs = Number(end - start) / 1_000_000;
    const marker = totalMs > 300 ? "🐌" : totalMs > 100 ? "🟡" : "✅";
    console.log(
      `${marker} ${req.method} ${req.originalUrl} — ${totalMs.toFixed(1)}ms`
    );
  });

  next();
};

export function mark(req: Request, label: string) {
  const marks = (req as any)._perfMarks;
  if (!marks) return;
  const t = process.hrtime.bigint();
  const prev = marks[marks.length - 1];
  const deltaMs = Number(t - prev.t) / 1_000_000;
  console.log(`   ↳ ${label}: +${deltaMs.toFixed(1)}ms`);
  marks.push({ label, t });
}