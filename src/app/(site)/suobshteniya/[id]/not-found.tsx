import Link from "next/link";

export default function ConversationNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-semibold">Разговорът не е намерен.</p>
      <Link href="/suobshteniya" className="text-sm text-brand hover:underline">
        Всички съобщения
      </Link>
    </div>
  );
}
