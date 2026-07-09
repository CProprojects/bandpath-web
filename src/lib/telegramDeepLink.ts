// Same-tab navigation on mobile lets the OS intercept the t.me link and
// foreground the native Telegram app directly, instead of spawning a
// second browser tab. On desktop, a new tab is safer since a same-tab
// redirect would navigate away from BandPath entirely if Telegram
// Desktop isn't installed (falls through to web.telegram.org).
export function openTelegramDeepLink(link: string) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = link;
  } else {
    window.open(link, "_blank");
  }
}
