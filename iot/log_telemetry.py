import csv
import time
import os
import socket
import re
from datetime import datetime

CSV_FILE = os.path.join(os.path.dirname(__file__), "iot_telemetry.csv")
PORTS = {
    "Node A (Pompe)": 4000,
    "Node B (Rucher)": 4001
}

PATTERN = re.compile(r"([a-zA-Z0-9\séÉ]+):\s*([0-9.-]+)")

def main():
    print("==================================================")
    print(" SMART FARM - COLLECTEUR DE DONNÉES EN DIRECT     ")
    print("==================================================")
    print(f"Enregistrement dans : {CSV_FILE}")

    try:
        with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if f.tell() == 0:
                writer.writerow(["Timestamp", "Node", "Metric", "Value"])
    except Exception as e:
        print(f"Erreur CSV : {e}")
        return

    print("\nÉcoute directe des ports Wokwi TCP 4000 & 4001...")
    
    sockets = {}
    buffers = {node: "" for node in PORTS}
    
    try:
        while True:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            for node, port in PORTS.items():
                if node not in sockets:
                    try:
                        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        s.settimeout(2)
                        s.connect(("127.0.0.1", port))
                        s.setblocking(False)
                        sockets[node] = s
                        print(f"[CONNECTÉ] {node} prêt (Port {port})")
                    except Exception:
                        continue 
                        
                s = sockets[node]
                try:
                    while True:
                        chunk = s.recv(1024).decode('utf-8', errors='ignore')
                        if not chunk:
                            print(f"[DÉCONNECTÉ] {node} déconnecté. Reconnexion...")
                            s.close()
                            del sockets[node]
                            break
                        
                        buffers[node] += chunk
                        
                        if "\n" in buffers[node]:
                            lines = buffers[node].split("\n")
                            buffers[node] = lines[-1]
                            
                            for line in lines[:-1]:
                                clean_line = line.strip()
                                match = PATTERN.search(clean_line)
                                if match:
                                    metric_raw = match.group(1).strip()
                                    val_str = match.group(2).strip()
                                    
                                    try:
                                        val = float(val_str)
                                        metric = metric_raw
                                        
                                        if "Humidit" in metric_raw and "Sol" in metric_raw:
                                            metric = "Humidité Sol"
                                        elif "Humidit" in metric_raw and "Ext" in metric_raw:
                                            metric = "Humidité Ext"
                                        elif "Poids" in metric_raw:
                                            metric = "Poids Ruche"
                                        elif "Couvain" in metric_raw:
                                            metric = "Temp Couvain"
                                        elif "Pression" in metric_raw:
                                            metric = "Pression"
                                        elif "bit" in metric_raw:
                                            metric = "Débit"
                                        elif "Temp Sol" in metric_raw:
                                            metric = "Temp Sol"
                                        elif "Temp Ext" in metric_raw:
                                            metric = "Temp Ext"
                                            
                                        with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
                                            writer = csv.writer(f)
                                            writer.writerow([timestamp, node, metric, val])
                                            
                                        print(f"[{timestamp}] {node} -> {metric}: {val}")
                                    except ValueError:
                                        pass
                except BlockingIOError:
                    pass 
                except Exception as e:
                    print(f"[ERREUR] {node} : {e}")
                    try: s.close()
                    except: pass
                    del sockets[node]
                    
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nCollecte interrompue.")
        for s in sockets.values():
            try: s.close()
            except: pass

if __name__ == "__main__":
    main()




if __name__ == "__main__":
    main()



