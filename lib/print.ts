export function printNode(node: HTMLElement, title: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
  doc.close();
  doc.title = title;
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((element) => {
    doc.head.appendChild(element.cloneNode(true));
  });
  const extra = doc.createElement("style");
  extra.textContent = "body{margin:0;background:#fff!important;padding:28px;color:#0f172a}.no-print{display:none!important}@page{margin:16mm}";
  doc.head.appendChild(extra);
  const wrapper = doc.createElement("div");
  wrapper.innerHTML = node.innerHTML;
  doc.body.appendChild(wrapper);
  window.setTimeout(() => {
    win.focus();
    win.print();
    window.setTimeout(() => frame.remove(), 800);
  }, 250);
}
