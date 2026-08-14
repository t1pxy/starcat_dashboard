"use client";

import { useEffect } from "react";

/**
 * The most likely failure here is the database being unreachable or the
 * credentials being wrong, so the message says which knobs to check rather
 * than dumping a stack trace at the user.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[devices] โหลดข้อมูลไม่สำเร็จ", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30">
        <h1 className="text-lg font-semibold text-red-900 dark:text-red-200">
          โหลดข้อมูลจาก Starcat ไม่สำเร็จ
        </h1>
        <p className="mt-2 text-sm text-red-800 dark:text-red-300">
          เชื่อมต่อฐานข้อมูล MSSQL ไม่ได้ หรือคำสั่ง query ทำงานผิดพลาด
        </p>

        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-300">
          <li>
            ตรวจสอบค่าใน <code className="font-mono">.env.local</code> — server,
            database, user, password
          </li>
          <li>ตรวจว่าเครื่องนี้เข้าถึง SQL Server ได้ (VPN / firewall / port 1433)</li>
          <li>ตรวจว่าบัญชีที่ใช้มีสิทธิ์อ่านตารางที่เกี่ยวข้อง</li>
        </ul>

        {/*
          The raw message can carry a server name, a login or a fragment of SQL,
          and it is meaningless to the person who just wanted the device list —
          so it is folded away for whoever is actually debugging. The digest is
          what ties this screen to the server log entry.
        */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-red-800 dark:text-red-300">
            รายละเอียดทางเทคนิค (สำหรับผู้ดูแลระบบ)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-red-100 p-3 text-xs text-red-900 dark:bg-red-950/60 dark:text-red-200">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        </details>

        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </main>
  );
}
