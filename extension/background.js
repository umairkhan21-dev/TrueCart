if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

      if (message.type === "PRODUCT_DATA") {
        console.log(
          "TrueCart background received PRODUCT_DATA",
          message.data
        );

        chrome.storage.local.set({
          productData: message.data,
        });

        sendResponse({ ok: true });
      }

      return true;
    }
  );
}