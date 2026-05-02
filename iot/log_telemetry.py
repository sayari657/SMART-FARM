import csv
import time
import os
import socket
import re
from datetime import datetime

CSV_FILE = os.path.join(os.path.dirname(__file__), "iot_telemetry.csv")

# TCP ports must match rfc2217ServerPort in each node's wokwi.toml
PORTS = {
    "NODE_A": 4000,
    "NODE_B": 4001,
}

# [NODE_A] key:value key:value ...
NODE_PATTERN  = re.compile(r"^\[NODE_([AB])\]\s+(.+)$")
# individual key:value pair (value may be float or text like ONLINE)
KV_PATTERN    = re.compile(r"(\w+):([0-9A-Za-z._+-]+)")
# [ALERT] / [WARN] / [IRRIGATION] / [INFO] event lines
EVENT_PATTERN = re.compile(r"^\[(ALERT|WARN|IRRIGATION|INFO)\]\s+(.+)$")


def process_line(line: str, node_tag: str):
    if not line:
        return
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Structured telemetry line ─────────────────────────────────────────────
    m = NODE_PATTERN.match(line)
    if m:
        tag  = f"NODE_{m.group(1)}"
        rest = m.group(2)
        rows = []
        for key, val in KV_PATTERN.findall(rest):
            try:
                numeric = float(val)
                rows.append([timestamp, tag, key, numeric])
                print(f"[{timestamp}] {tag} → {key}: {numeric}")
            except ValueError:
                pass  # skip non-numeric fields like mode:ONLINE
        if rows:
            with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerows(rows)
        return

    # ── Event / alert line ────────────────────────────────────────────────────
    m2 = EVENT_PATTERN.match(line)
    if m2:
        evtype = m2.group(1)
        detail = m2.group(2)
        print(f"[{timestamp}] {node_tag} [{evtype}] {detail}")
        with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow([timestamp, node_tag, evtype, detail])


def main():
    print("=" * 50)
    print(" SMART FARM — COLLECTEUR DE DONNÉES EN DIRECT")
    print("=" * 50)
    print(f"Enregistrement : {CSV_FILE}")
    print(f"Écoute TCP  NODE_A:{PORTS['NODE_A']}  NODE_B:{PORTS['NODE_B']}\n")

    # Write CSV header if file is new
    if not os.path.exists(CSV_FILE) or os.path.getsize(CSV_FILE) == 0:
        with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(["Timestamp", "Node", "Metric", "Value"])

    sockets = {}
    buffers = {node: "" for node in PORTS}

    try:
        while True:
            for node, port in PORTS.items():
                # (Re)connect if socket absent
                if node not in sockets:
                    try:
                        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        s.settimeout(2)
                        s.connect(("127.0.0.1", port))
                        s.setblocking(False)
                        sockets[node] = s
                        print(f"[CONNECTÉ] {node} (port {port})")
                    except Exception:
                        continue

                s = sockets[node]
                try:
                    while True:
                        chunk = s.recv(1024).decode("utf-8", errors="ignore")
                        if not chunk:
                            print(f"[DÉCONNECTÉ] {node} — reconnexion dans 5 s")
                            s.close()
                            del sockets[node]
                            break
                        buffers[node] += chunk
                        if "\n" in buffers[node]:
                            lines = buffers[node].split("\n")
                            buffers[node] = lines[-1]
                            for line in lines[:-1]:
                                process_line(line.strip(), node)
                except BlockingIOError:
                    pass
                except Exception as e:
                    print(f"[ERREUR] {node}: {e}")
                    try:
                        s.close()
                    except Exception:
                        pass
                    if node in sockets:
                        del sockets[node]

            time.sleep(1)

    except KeyboardInterrupt:
        print("\nCollecte interrompue.")
        for s in sockets.values():
            try:
                s.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
