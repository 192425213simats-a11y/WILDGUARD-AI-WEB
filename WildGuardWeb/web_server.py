# web_server.py - Custom Static File Server with Silent Router Suppressions
import http.server
import socketserver
import os
import sys

PORT = 3000

class CleanStaticServer(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging for noisy browser extension tracker requests in the command prompt
        log_line = format % args
        if "zybTracker" in log_line or "hybridaction" in log_line or "favicon.ico" in log_line or "copilot" in log_line:
            return
        super().log_message(format, *args)

    def do_GET(self):
        # Gracefully mock Zhiyun Gimbal tracker extensions to prevent HTTP 404 failures
        if "hybridaction" in self.path or "zybTracker" in self.path:
            self.send_response(200)
            
            # Check if this is a script callback JSONP or simple JSON
            if "callback" in self.path or "__callback__" in self.path:
                self.send_header("Content-Type", "application/javascript")
            else:
                self.send_header("Content-Type", "application/json")
                
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            # Extract callback function name if present to return valid JS
            callback = None
            if "__callback__=" in self.path:
                try:
                    callback = self.path.split("__callback__=")[1].split("&")[0]
                except Exception:
                    pass
            elif "callback=" in self.path:
                try:
                    callback = self.path.split("callback=")[1].split("&")[0]
                except Exception:
                    pass
                    
            if callback:
                self.wfile.write(f"{callback}({{}});".encode("utf-8"))
            else:
                self.wfile.write(b"{}")
            return
            
        return super().do_GET()

# Ensure server is running in the script's own folder
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("===================================================")
print(f"  WildGuard AI - Custom Web Server on Port {PORT}")
print("  Suppressed Tracker/Extension Noisy Logs.")
print("===================================================")

# Set port reuse options to avoid "address already in use" errors during quick restarts
socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("", PORT), CleanStaticServer) as httpd:
        print("Keep this window open while using the application.")
        print("Press Ctrl+C in this window to stop the server.")
        print("===================================================")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nShutting down web server cleanly...")
    sys.exit(0)
except Exception as e:
    print(f"Server error: {e}")
    sys.exit(1)
