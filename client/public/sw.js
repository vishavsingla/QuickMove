/* QuickMove service worker — web push notification stub */
self.addEventListener("push", (event) => {
  let payload = { title: "QuickMove", body: "You have a new update" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payload */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
