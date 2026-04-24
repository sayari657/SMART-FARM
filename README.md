# Smart Farm AI 🌿 (v3.0-Enterprise)

> **Sovereign Agriculture. Multimodal Intelligence. Zero-Cost Infrastructure.**

Smart Farm AI is a production-grade, Multi-Tenant ecosystem designed for the Tunisian agricultural landscape. By merging Multimodal LLMs (MLLM), Real-time IoT, and Local RAG, it provides farmers with an intelligent "Digital Twin" that understands, sees, and speaks Tunisian Derja.

---

## 🏗️ Enterprise Hybrid Architecture (100% Open Source)

To ensure zero operational costs and data sovereignty, the platform runs entirely on self-hosted, license-free technology.

### 🧠 [1] Hybrid MLLM & RAG Engine
Instead of costly APIs, we use local inference engines:
- **Vision & Logic**: Llava-v1.5-7B via Ollama for real-time visual analysis of crops and livestock.
- **Tunisian Derja Interface**: Labess-7B (by Linagora) fine-tuned for local dialect understanding.
- **Knowledge Memory**: ChromaDB (Vector Database) stores local agricultural wisdom without subscription fees.

### 📡 [2] Multi-Tenant Infrastructure
- **Edge Gateway**: Lightweight Raspberry Pi 5 / Jetson nodes using Eclipse Mosquitto (MQTT) for IoT and Gstreamer for low-latency video streams.
- **Local Sovereign Cloud**: Centralized multi-farm management hosted on private Tunisian servers using Docker Compose.
- **Security**: End-to-end encryption with no data leaving the national territory.

---

## 🗂️ Specialized Livestock Modules (Dynamic RAG)

The system is modular. Activating a species module injects specific Expert Knowledge Packs (curated from UTAP/AVFA datasets) into the RAG pipeline.

| Module | Core Intelligence | Expert Dataset Source |
| :--- | :--- | :--- |
| **Poultry** | Mortality detection & Avian flu tracking | AVFA Poultry Guides |
| **Sheep** | Lambing cycle & Lameness visual analysis | ENMV Sidi Thabet |
| **Bees** | Acoustic swarm detection & Hive thermics | Tunisian Apiculture Assoc. |
| **Rabbit** | Feed conversion & Nest temperature monitoring | Local Vet Protocols |

---

## 🔬 Local Ecosystem Integration

Smart Farm AI is built specifically for the Tunisian context:
- **Dataset**: Integrated with Tunisia.AI open-source linguistic corpora.
- **Validation**: Collaboration with ENMV Sidi Thabet for veterinary visual diagnostic accuracy.
- **Administrative Support**: RAG-assisted APIA grant application filing (in Derja).
- **Village Hub**: Optimized for deployment in collaboration with Startup Village (Charguia) experts.

---

## 💬 Real-world Interaction (Example)

**Scenario**: IoT sensor detects 39°C in a Bee Hive. The MLLM analyzes the history and the RAG checks the Tunisian Beekeeping Guide.

**System Output (Derja)**:
```json
{
  "status": "ALERT",
  "reason": "Heat Stress in Hive B04",
  "output_derja": "يا فلاح، البيوت متاع النحل (Rucher) سخنت برشة، وصلت لـ 39 درجة. حسب دليل تربية النحل في تونس، لازمك تظلل عليهم وتوفر الماء قريب باش ما تخسرش العسل."
}
```

---

## 🚀 Deployment (Self-Hosted)

Spin up the entire enterprise stack (MLLM + VectorDB + Backend + Dashboard) with zero fees:

```bash
# 1. Start Ollama with Llava and Labess
ollama run llava
ollama run wghezaiel/labess-7b-chat

# 2. Launch the sovereign stack
docker-compose up -d
```

---

## 📄 License & Independence

**MIT License** — Precision-engineered for commercial expansion with Zero Dependency on international paid APIs. Designed to be free, open, and scalable for the Tunisian farmer.

---

### Why this is the perfect tool for your farm:
- **Total Independence**: Mastery of Ollama and ChromaDB ensures the project never stops even if an API becomes paid.
- **Local Impact**: Real-world Derja interaction and ENMV collaboration prove it's a solution made by Tunisians for Tunisians.
- **B2B Ready**: "Sovereign Cloud" architecture is the key for large agricultural enterprises or state projects.
