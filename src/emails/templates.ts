import { renderEmail, type EmailContent } from "./layout";

export function verifyEmailTemplate(input: { name: string; url: string }): EmailContent {
  return renderEmail("Потвърди имейла си в MobiTed", `Здравей, ${input.name}`, [
    { kind: "paragraph", text: "Потвърди имейл адреса си, за да активираш профила си в MobiTed." },
    { kind: "button", label: "Потвърди имейла", url: input.url },
    { kind: "note", text: "Връзката е валидна 24 часа. Ако не си създавал профил, игнорирай това съобщение." },
  ]);
}

export function resetPasswordTemplate(input: { name: string; url: string }): EmailContent {
  return renderEmail("Нова парола за MobiTed", `Здравей, ${input.name}`, [
    { kind: "paragraph", text: "Получихме заявка за смяна на паролата ти." },
    { kind: "button", label: "Задай нова парола", url: input.url },
    { kind: "note", text: "Връзката е валидна 1 час. Ако не си заявявал смяна, игнорирай това съобщение." },
  ]);
}

export function newMessageTemplate(input: { name: string; listingTitle: string; url: string }): EmailContent {
  return renderEmail(`Ново съобщение за ${input.listingTitle}`, `Здравей, ${input.name}`, [
    { kind: "paragraph", text: `Имаш ново съобщение относно обявата „${input.listingTitle}“.` },
    { kind: "button", label: "Отвори съобщението", url: input.url },
  ]);
}

export function savedSearchAlertTemplate(input: { name: string; searchName: string; count: number; url: string }): EmailContent {
  return renderEmail(`Нови обяви: ${input.searchName}`, `Здравей, ${input.name}`, [
    { kind: "paragraph", text: `Има ${input.count} нови обяви по запазеното търсене „${input.searchName}“.` },
    { kind: "button", label: "Виж обявите", url: input.url },
  ]);
}
