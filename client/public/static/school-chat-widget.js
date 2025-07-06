(function() {
  // Prevent double-injection
  if (window.__schoolChatWidgetLoaded) return;
  window.__schoolChatWidgetLoaded = true;

  // Find the script tag that loaded this file
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  // Parse schoolCode from query string
  var schoolCode = "SXSBT"; // default
  if (currentScript && currentScript.src) {
    var match = currentScript.src.match(/[?&]schoolCode=([^&]+)/);
    if (match) schoolCode = decodeURIComponent(match[1]);
  }

  // Log for debugging
  console.log('School chat widget loaded', schoolCode);

  // --- BEGIN WIDGET LOGIC ---
  // Example: create a floating chat button
  var btn = document.createElement('button');
  btn.innerText = '💬 Chat';
  btn.style.position = 'fixed';
  btn.style.bottom = '24px';
  btn.style.right = '24px';
  btn.style.zIndex = 99999;
  btn.style.background = '#2563eb';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '50%';
  btn.style.width = '56px';
  btn.style.height = '56px';
  btn.style.fontSize = '28px';
  btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
  btn.style.cursor = 'pointer';
  btn.title = 'Chat with us!';
  document.body.appendChild(btn);

  // Example: open a simple chat window on click
  btn.addEventListener('click', function() {
    if (document.getElementById('__schoolChatWidgetFrame')) return;
    var iframe = document.createElement('iframe');
    iframe.id = '__schoolChatWidgetFrame';
    iframe.src = '/widget.html?schoolCode=' + encodeURIComponent(schoolCode);
    iframe.style.position = 'fixed';
    iframe.style.bottom = '90px';
    iframe.style.right = '24px';
    iframe.style.width = '370px';
    iframe.style.height = '520px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '18px';
    iframe.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
    iframe.style.zIndex = 99999;
    document.body.appendChild(iframe);
    // Close on outside click (optional)
    function closeOnClick(e) {
      if (!iframe.contains(e.target) && e.target !== btn) {
        iframe.remove();
        document.removeEventListener('mousedown', closeOnClick);
      }
    }
    setTimeout(function() {
      document.addEventListener('mousedown', closeOnClick);
    }, 100);
  });
  // --- END WIDGET LOGIC ---
})(); 