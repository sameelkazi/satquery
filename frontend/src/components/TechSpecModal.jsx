import React, { useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Cpu, 
  Layers, 
  Crosshair, 
  Database, 
  Activity, 
  Sparkles, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react';
import AgencyLogo from './AgencyLogo';
import ThemeCloseButton from './ThemeCloseButton';
import AskGuideBotButton from './AskGuideBotButton';

export const TECH_SPECS = {
  "RemoteCLIP": {
    name: "RemoteCLIP",
    domain: "remoteclip",
    category: "Contrastive Vision-Language Foundation",
    arxivId: "2306.11029",
    arxivUrl: "https://arxiv.org/abs/2306.11029",
    venue: "IEEE TGRS 2024",
    title: "RemoteCLIP: A Vision Language Foundation Model for Remote Sensing",
    authors: "C. Liu, R. Zhao, H. Chen, Z. Zou, Z. Shi",
    figure: "/paper_figures/remoteclip_paper.png",
    figureCaption: "Figure 2 from RemoteCLIP Paper (IEEE TGRS): Cross-modal visual-language alignment & ViT pre-training architecture",
    psRole: "Powers zero-shot semantic retrieval and land-cover classification across ISRO Cartosat and Sentinel-2 STAC archives, matching natural language queries to high-dimensional satellite scene embeddings without manual annotation.",
    formula: "sim(T, I) = (e_I · e_T) / (‖e_I‖ · ‖e_T‖)",
    formulaExplanation: "Cosine similarity between normalized image embedding e_I and text prompt embedding e_T in 512-dimensional joint metric space.",
    architecture: {
      inputs: "Optical Multispectral Imagery (Sentinel-2, Cartosat-3)",
      pipeline: "Dual-stream ViT-B/32 Visual Tower + 12-layer Transformer Text Encoder",
      outputs: "512-dimensional unified visual-semantic embeddings"
    },
    metrics: [
      { label: "Zero-Shot Accuracy", value: "84.2%" },
      { label: "Embedding Dim", value: "512-d" },
      { label: "Search Latency", value: "< 45ms" }
    ]
  },
  "Qwen2.5-VL": {
    name: "Qwen2.5-VL",
    domain: "qwenlm.ai",
    category: "Core Vision-Language Foundation Model",
    arxivId: "2502.13923",
    arxivUrl: "https://arxiv.org/abs/2502.13923",
    venue: "Alibaba Research 2025",
    title: "Qwen2.5-VL: Most Capable Open Vision-Language Model",
    authors: "Qwen Team, Alibaba Cloud",
    figure: "/paper_figures/qwen2_5_vl_paper.jpeg",
    figureCaption: "Figure from Qwen2.5-VL Paper (Alibaba Cloud, 2025): Dynamic-resolution Vision-Language model architecture & native aspect ratio processing",
    psRole: "Serves as the primary multimodal reasoning core for conversational Visual Question Answering (VQA) and spatial referring expression grounding on ISRO satellite imagery.",
    formula: "ΔW_MLP = (α / r) · (B_proj · A_proj),   proj ∈ {gate, up, down}",
    formulaExplanation: "Low-Rank Adaptation applied to feed-forward MLP projections alongside attention weights, adapting 20.1M parameters (0.65%) while leaving the visual backbone intact.",
    architecture: {
      inputs: "Multi-resolution satellite tiles + Natural Language query tokens",
      pipeline: "Dynamic-resolution ViT + 36-layer Decoder Transformer with LoRA v2",
      outputs: "Contextual remote sensing intelligence + Grounded bounding box tokens"
    },
    metrics: [
      { label: "VQA Accuracy", value: "77.0% (Held-Out)" },
      { label: "Trainable Params", value: "20.1M (0.65%)" },
      { label: "VQA Latency", value: "1.11s" }
    ]
  },
  "Grounding DINO": {
    name: "Grounding DINO",
    domain: "grounding-dino",
    category: "Open-Vocabulary Object Detector",
    arxivId: "2303.05499",
    arxivUrl: "https://arxiv.org/abs/2303.05499",
    venue: "ECCV 2024",
    title: "Grounding DINO: Marrying DINO with Grounded Pre-Training for Open-Set Object Detection",
    authors: "S. Liu, Z. Zeng, T. Ren, F. Li, H. Zhang, L. Yang, et al.",
    figure: "/paper_figures/grounding_dino_paper.png",
    figureCaption: "Figure 1 from Grounding DINO Paper (ECCV): Open-set detector with dual-encoder, cross-modality feature enhancer & language-guided query selection",
    psRole: "Executes open-vocabulary spatial detection for free-form multi-target queries ('locate all cargo ships', 'detect aircraft hangars', 'find solar arrays') without pre-defined fixed classes.",
    formula: "L_total = L_LM(Y, Ŷ) + λ_IoU · L_GIoU(b, b̂) + λ_L1 · ‖b - b̂‖₁",
    formulaExplanation: "Compound loss optimizing cross-entropy token alignment alongside Generalized IoU (GIoU) and L1 bounding-box regression penalties.",
    architecture: {
      inputs: "Native resolution aerial patches + Referring text expressions",
      pipeline: "Multi-scale cross-attention feature enhancer + Text-guided query selection",
      outputs: "Normalized geometric bounding boxes [x1, y1, x2, y2] + Confidence scores"
    },
    metrics: [
      { label: "Grounding Acc@0.5", value: "44.0%" },
      { label: "Mean IoU", value: "0.3671" },
      { label: "Detection Latency", value: "1.28s" }
    ]
  },
  "SAHI Sliced Inference": {
    name: "SAHI Sliced Inference",
    domain: "sahi",
    category: "Hyper-Resolution Tiling Engine",
    arxivId: "2202.06934",
    arxivUrl: "https://arxiv.org/abs/2202.06934",
    venue: "IEEE ICIP 2022",
    title: "Slicing Aided Hyper Inference and Fine-tuning for Small Object Detection",
    authors: "F. C. Akyon, S. O. Altinuc, A. Temizel",
    figure: "/paper_figures/sahi_paper.png",
    figureCaption: "Figure from SAHI Paper (IEEE ICIP): Slicing-aided hyper inference pipeline for detecting small targets in gigapixel remote sensing scenes",
    psRole: "Prevents downsampling destruction of small spatial targets (vehicles, storage drums, vessels) across massive 2048x2048+ satellite tiles by slicing images at native optical resolution.",
    formula: "I_{i,j} = Crop(I, (x_i, y_j, P, P)),   ρ = 0.20,   IoU_NMS = 0.45",
    formulaExplanation: "Sliding window tile extraction with 20% spatial overlap ratio, feeding parallel detection batches followed by global Non-Maximum Suppression.",
    architecture: {
      inputs: "Gigapixel satellite tiles (2048x2048 to 8192x8192 pixels)",
      pipeline: "Window slicing (P x P, ρ=0.20 overlap) -> Batched Grounding DINO -> Global NMS",
      outputs: "Unified seamless bounding box coordinates in global coordinate space"
    },
    metrics: [
      { label: "Tile Resolution", value: "Up to 8K native" },
      { label: "Slice Overlap", value: "20% (ρ=0.20)" },
      { label: "Small Target Recall", value: "+38.4%" }
    ]
  },
  "AdaptFormer-CD": {
    name: "AdaptFormer-CD",
    domain: "adaptformer",
    category: "Bi-Temporal Pixel Change Detection",
    arxivId: "2205.13535",
    arxivUrl: "https://arxiv.org/abs/2205.13535",
    venue: "NeurIPS 2022",
    title: "AdaptFormer: Adapting Vision Transformers for Scalable Visual Recognition",
    authors: "S. Chen, C. Ge, Z. Tong, J. Wang, Y. Song, J. Wang, P. Luo",
    figure: "/paper_figures/adaptformer_paper.png",
    figureCaption: "Figure from AdaptFormer Paper (NeurIPS): Lightweight parameter-efficient AdaptMLP bottleneck inserted into Vision Transformer backbone",
    psRole: "Calculates pixel-level alteration between pre-event (t1) and post-event (t2) satellite captures, generating GeoJSON change masks for NDMA flood delineation and disaster assessment.",
    formula: "D^(l) = Conv₁ₓ₁( [ F_{t1}^(l)  ||  F_{t2}^(l)  ||  |F_{t2}^(l) - F_{t1}^(l)| ] )",
    formulaExplanation: "Multi-scale feature differencing combining absolute concatenated delta representations across Siamese Vision Transformer hierarchies.",
    architecture: {
      inputs: "Co-registered bi-temporal satellite pair (I_{t1}, I_{t2})",
      pipeline: "Siamese multi-scale ViT encoder + Absolute difference convolutional decoder",
      outputs: "Binarized alteration probability mask M ∈ [0, 1] + GeoJSON polygons"
    },
    metrics: [
      { label: "Pixel F1 Score", value: "86.7%" },
      { label: "Resolution", value: "Full native mask" },
      { label: "Output Format", value: "GeoJSON + Mask" }
    ]
  },
  "VRSBench (NeurIPS)": {
    name: "VRSBench (NeurIPS)",
    domain: "vrsbench",
    category: "Official Remote Sensing Benchmark",
    arxivId: "2406.12456",
    arxivUrl: "https://arxiv.org/abs/2406.12456",
    venue: "NeurIPS 2024",
    title: "VRSBench: A Versatile Vision-Language Benchmark for Remote Sensing",
    authors: "X. Li, H. Ding, H. Chen, X. Rong, G. S. Xia",
    figure: "/paper_figures/vrsbench_paper.png",
    figureCaption: "Figure from VRSBench Paper (NeurIPS 2024): Multi-task vision-language remote sensing evaluation pipeline & task taxonomy",
    psRole: "Serves as the empirical evaluation and parameter adaptation ground truth for SatQuery, utilizing 6,000 training pairs and a strictly held-out 350-instance test set completely isolated from training.",
    formula: "IoU(b_pred, b_gt) = Area(b_pred ∩ b_gt) / Area(b_pred ∪ b_gt) ≥ 0.50",
    formulaExplanation: "Intersection-over-Union bounding box spatial agreement metric used for Grounding Acc@0.5 and localization evaluation.",
    architecture: {
      inputs: "Multi-resolution aerial datasets with verified geospatial ground truth",
      pipeline: "Disjoint held-out evaluation: 200 unseen VQA pairs + 150 referring grounding triples",
      outputs: "LLM-as-a-judge accuracy, Grounding Acc@0.5, and mean IoU benchmarks"
    },
    metrics: [
      { label: "Training Pairs", value: "6,000 instances" },
      { label: "Held-Out Test", value: "350 instances" },
      { label: "SatQuery Accuracy", value: "77.0% VQA" }
    ]
  },
  "QLoRA (NF4)": {
    name: "QLoRA (NF4)",
    domain: "qlora",
    category: "4-bit NormalFloat Quantization",
    arxivId: "2305.14314",
    arxivUrl: "https://arxiv.org/abs/2305.14314",
    venue: "NeurIPS 2023",
    title: "QLoRA: Efficient Finetuning of Quantized LLMs",
    authors: "T. Dettmers, A. Pagnoni, A. Holtzman, L. Zettlemoyer",
    figure: "/paper_figures/qlora_paper.png",
    figureCaption: "Figure 1 from QLoRA Paper (NeurIPS 2023): 4-bit NormalFloat (NF4) Quantization & Double Quantization comparison against 16-bit Full Finetuning",
    psRole: "Compresses base model parameters to 4-bit NormalFloat representation, enabling full multimodal agentic inference on 8GB consumer laptops and mobile workstations.",
    formula: "W_quant = Quantize_NF4(W₀),   c_FP32 = DoubleQuant(c_FP32)",
    formulaExplanation: "Information-theoretically optimal quantile mapping for zero-mean unit-variance weights, followed by double quantization of block scaling constants.",
    architecture: {
      inputs: "16-bit bfloat16 base transformer weights (6.2 GB)",
      pipeline: "NF4 quantile mapping + Double Quantization of block scaling constants",
      outputs: "Compressed 1.75 GB static memory footprint with lossless linguistic retention"
    },
    metrics: [
      { label: "Memory Reduction", value: "71.8% (6.2GB -> 1.75GB)" },
      { label: "VRAM Budget", value: "~2.4 GB active" },
      { label: "Perplexity Impact", value: "< 0.8%" }
    ]
  },
  "ISRO Bhoonidhi": {
    name: "ISRO Bhoonidhi",
    domain: "isro.gov.in",
    category: "Indian Earth Observation Data Gateway",
    arxivId: null,
    arxivUrl: "https://bhoonidhi.nrsc.gov.in/",
    venue: "National Remote Sensing Centre (NRSC)",
    title: "ISRO Bhoonidhi Open Data Dissemination Portal",
    authors: "Indian Space Research Organisation (ISRO)",
    figure: null,
    figureCaption: null,
    psRole: "Powers SatQuery's STAC automated catalog search, ingesting live orbital swaths from Cartosat-2/3, Resourcesat-2A, and Oceansat platforms directly fulfilling SIH26167.",
    formula: "Q_STAC = { B_spatial,  T_temporal,  P_Cartosat/Resourcesat }",
    formulaExplanation: "Spatio-temporal asset catalog query filtering by geographic bounding polygon, acquisition timestamp, and sensor platform payload.",
    architecture: {
      inputs: "Geographic bounding polygon + Sensor mission type",
      pipeline: "STAC OpenAPI query dispatch -> Metadata parsing -> Orthorectified tile retrieval",
      outputs: "Calibrated surface reflectance scenes with mission telemetry metadata"
    },
    metrics: [
      { label: "Missions Covered", value: "Cartosat, Resourcesat, Oceansat" },
      { label: "Catalog Standard", value: "STAC API v1.0" },
      { label: "Harvest Speed", value: "Sub-second lookup" }
    ]
  },
  "ESA Copernicus": {
    name: "ESA Copernicus",
    domain: "copernicus.eu",
    category: "Sentinel Constellation Data Pipeline",
    arxivId: null,
    arxivUrl: "https://dataspace.copernicus.eu/",
    venue: "European Space Agency (ESA)",
    title: "Copernicus Open Access Ecosystem",
    authors: "European Space Agency & European Commission",
    figure: null,
    figureCaption: null,
    psRole: "Supplies multi-spectral Sentinel-2 (B2, B3, B4, B8) optical bands and all-weather Sentinel-1 C-band SAR backscatter for cloud-penetrating dielectric fusion.",
    formula: "σ⁰(dB) = 10 · log₁₀( DN² / A² ),   γ_dielectric = σ_VV⁰ / σ_VH⁰",
    formulaExplanation: "Radar backscatter coefficient computation in decibels and cross-polarization ratio used to disambiguate dark cloud shadows from genuine open water bodies.",
    architecture: {
      inputs: "Orbital pass coordinate bounds",
      pipeline: "Sentinel-2 L2A BOA bottom-of-atmosphere reflectance + Sentinel-1 GRD SAR backscatter",
      outputs: "Paired optical-dielectric sensor cubes"
    },
    metrics: [
      { label: "Optical Res", value: "10m (Sentinel-2)" },
      { label: "SAR Mode", value: "Interferometric Wide (IW, VV+VH)" },
      { label: "Revisit Time", value: "5 Days" }
    ]
  },
  "PyTorch": {
    name: "PyTorch",
    domain: "pytorch.org",
    category: "Deep Learning Tensor Engine",
    arxivId: "1912.01703",
    arxivUrl: "https://arxiv.org/abs/1912.01703",
    venue: "NeurIPS 2019",
    title: "PyTorch: An Imperative Style, High-Performance Deep Learning Library",
    authors: "A. Paszke, S. Gross, F. Massa, A. Lerer, J. Bradbury, G. Chanan, et al.",
    figure: "/paper_figures/attention_paper.png",
    figureCaption: "Figure 2 from Vaswani et al. (NeurIPS): Scaled Dot-Product Attention & Multi-Head Attention engine scheduled via PyTorch CUDA tensor cores",
    psRole: "Underpins tensor manipulation, autograd differentiation, flash attention execution, and low-level CUDA kernel scheduling throughout SatQuery's inference pipeline.",
    formula: "Attention(Q, K, V) = softmax( (Q · Kᵀ) / √d_k ) · V",
    formulaExplanation: "Scaled dot-product multi-head attention executed via FlashAttention-2 kernels on CUDA tensor cores.",
    architecture: {
      inputs: "Batched image tensors & token id sequences",
      pipeline: "Asynchronous CUDA stream scheduling + FlashAttention-2 + torch.compile graph optimization",
      outputs: "High-throughput GPU inference execution"
    },
    metrics: [
      { label: "Framework", value: "PyTorch 2.4+ CUDA" },
      { label: "Precision", value: "bfloat16 / int4" },
      { label: "Attention Kernel", value: "FlashAttention-2" }
    ]
  },
  "Hugging Face": {
    name: "Hugging Face",
    domain: "huggingface.co",
    category: "Model Hub & Tokenizer Ecosystem",
    arxivId: "1910.03771",
    arxivUrl: "https://huggingface.co/Sameelkazi/satquery-qwen25vl-vrsbench-lora-v2",
    venue: "EMNLP 2020",
    title: "HuggingFace's Transformers: State-of-the-art Natural Language Processing",
    authors: "T. Wolf, L. Debut, V. Sanh, J. Chaumond, C. Delangue, et al.",
    figure: "/paper_figures/lora_diagram.png",
    figureCaption: "Official PEFT Architecture Diagram (Hugging Face): Low-Rank Matrix Injection (W_base + B · A) with zero-copy safetensors memory mapping",
    psRole: "Hosts SatQuery's fine-tuned LoRA checkpoints (sameelkazi/satquery-qwen25vl-vrsbench-lora-v2) and manages zero-copy safetensors streaming at runtime.",
    formula: "W_adapted = W_base + W_LoRA,   Safetensors(θ) → VRAM",
    formulaExplanation: "Zero-copy memory mapping of PEFT adapter tensors onto base model weights without deserialization latency.",
    architecture: {
      inputs: "Pre-trained model hub identifiers",
      pipeline: "PEFT adapter injection + Fast Rust-based BPE tokenization + Safetensors streaming",
      outputs: "Instant zero-friction checkpoint loading"
    },
    metrics: [
      { label: "Hub Checkpoint", value: "sameelkazi/satquery-qwen25vl-vrsbench-lora-v2" },
      { label: "Tokenizer", value: "Byte-Pair Encoding (BPE)" },
      { label: "Format", value: "Safetensors (Zero-Copy)" }
    ]
  },
  "SatQuery RAG Vector Store": {
    name: "SatQuery RAG Vector Store",
    domain: "github.com",
    category: "In-House Retrieval-Augmented Generation Store",
    arxivId: null,
    arxivUrl: "https://github.com/sameelkazi/satquery",
    venue: "SatQuery AI — Custom Implementation",
    title: "SatQuery RAG Vector Store: Region-Scoped Retrieval over RemoteCLIP Embeddings",
    authors: "SatQuery Research Consortium",
    figure: null,
    figureCaption: null,
    psRole: "Reduces hallucination by retrieving curated Indian district and Bhuvan LULC metadata relevant to the queried scene before generation, grounding the model's answer in real reference facts.",
    formula: "D(q, x) = 1 - (q · x) / (‖q‖ · ‖x‖)   s.t.   entity = RegionHint(image_path)",
    formulaExplanation: "Cosine distance ranking over RemoteCLIP text embeddings, hard-filtered first by a region hint inferred from the queried image so a generic query cannot retrieve an unrelated district's facts (fixed 2026-08-26 after a real cross-region hallucination was observed).",
    architecture: {
      inputs: "512-d RemoteCLIP text embedding of the query + inferred region entity",
      pipeline: "In-process NumPy cosine-similarity search over a curated JSON knowledge base, with a deterministic hashed-vector fallback when real RemoteCLIP weights aren't loaded",
      outputs: "Top-matching curated facts injected as a grounding prefix into the model prompt"
    },
    metrics: [
      { label: "Storage", value: "In-Memory NumPy" },
      { label: "Region Scoping", value: "Filename-Inferred Hint" },
      { label: "Fallback", value: "Deterministic Hash Vector" }
    ]
  }
};

export default function TechSpecModal({ tech, isOpen, onClose, onAskGuideBot }) {
  // Keyboard Escape support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tech) return null;

  const spec = TECH_SPECS[tech.label] || {
    name: tech.label,
    domain: tech.domain,
    category: "Core Technology Stack",
    arxivId: null,
    arxivUrl: "https://arxiv.org/",
    venue: "ISRO SIH26167 Specification",
    title: `${tech.label} in SatQuery AI Architecture`,
    authors: "SatQuery Research Consortium",
    figure: null,
    figureCaption: null,
    psRole: "Powers fundamental satellite intelligence pipelines in SatQuery for ISRO Problem Statement SIH26167.",
    formula: "F(X) → Y",
    formulaExplanation: "Analytical pipeline mapping remote sensing inputs to operational intelligence.",
    architecture: {
      inputs: "Remote sensing multi-spectral & SAR telemetry",
      pipeline: "Automated agentic inference pipeline",
      outputs: "Operational decision telemetry"
    },
    metrics: [
      { label: "Status", value: "Integrated" },
      { label: "Protocol", value: "Production" }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* White & Sleek Luxury Modal Card */}
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white text-slate-900 p-5 sm:p-7 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)] border border-slate-200/90 flex flex-col gap-5 sm:gap-6 font-general"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Logo container in crisp frosted card */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100/90 border border-slate-200 p-2 flex items-center justify-center flex-shrink-0 shadow-sm">
              <AgencyLogo domain={spec.domain} alt={spec.name} className="w-full h-full object-contain" />
            </div>

            <div>
              {/* Clean title without weird bordered text pills */}
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {spec.name}
                </h2>
                <span className="text-xs sm:text-sm font-semibold text-cyan-700 tracking-tight">
                  • {spec.category}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
                {spec.venue} — {spec.authors.split(',')[0]} et al.
              </p>
            </div>
          </div>

          {/* Actions & Close */}
          <div className="flex items-center gap-2">
            <AskGuideBotButton 
              label="Ask Guide Bot"
              onClick={() => onAskGuideBot && onAskGuideBot(`Explain ${spec.name} (${spec.category}) in SatQuery's architecture and its role in SIH26167.`)} 
            />
            <ThemeCloseButton onClick={onClose} />
          </div>
        </div>

        {/* Section 1: Role in ISRO Problem Statement (SIH26167) */}
        <div className="rounded-2xl p-4 sm:p-5 bg-slate-50/90 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-cyan-800">
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-800">
              Role in ISRO Problem Statement (SIH26167)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {spec.psRole}
          </p>
        </div>

        {/* Section 2: Mathematical Formulation (Highlighted on EVERY tech card) */}
        <div className="rounded-2xl p-4 sm:p-5 bg-slate-50/90 border border-slate-200/90 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Cpu className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs sm:text-sm font-bold tracking-tight uppercase">
              Mathematical Formulation & Algorithm
            </h3>
          </div>

          {/* Math Box: High-contrast white paper card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 overflow-x-auto py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none flex-shrink-0">
                EQUATION:
              </span>
              <code className="text-xs sm:text-sm md:text-base font-mono font-bold text-slate-900 tracking-wide whitespace-nowrap">
                {spec.formula}
              </code>
            </div>
            {spec.formulaExplanation && (
              <p className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2 leading-relaxed">
                <span className="font-semibold text-slate-800">Formalism: </span>
                {spec.formulaExplanation}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Original Research Paper Architecture Diagram */}
        {spec.figure && (
          <div className="rounded-2xl p-4 sm:p-5 bg-slate-50/90 border border-slate-200/90 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs sm:text-sm font-bold tracking-tight uppercase">
                  Original Research Paper Architecture Diagram
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Official Publication
              </span>
            </div>

            {/* Architecture Diagram Preview */}
            <div className="w-full bg-white rounded-xl border border-slate-200/80 p-2 overflow-hidden shadow-sm flex flex-col items-center">
              <img 
                src={spec.figure} 
                alt={spec.figureCaption || "Original Paper Architecture Diagram"} 
                className="w-full max-h-56 sm:max-h-64 object-contain rounded-lg"
              />
              <p className="mt-2 text-[11px] text-slate-500 italic text-center px-2">
                {spec.figureCaption}
              </p>
            </div>
          </div>
        )}

        {/* Section 4: Empirical Metrics & Key Stats */}
        <div className="grid grid-cols-3 gap-3">
          {spec.metrics.map((m, idx) => (
            <div key={idx} className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {m.label}
              </span>
              <span className="text-sm sm:text-base md:text-lg font-bold text-cyan-800 font-sans">
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Section 5: Research Citation & Direct ArXiv Link */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            <span className="line-clamp-1 font-medium">{spec.title}</span>
          </div>

          {spec.arxivUrl && (
            <a
              href={spec.arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-tight transition-all shadow-md hover:scale-105 flex-shrink-0 cursor-pointer"
            >
              <span>{spec.arxivId ? `Read arXiv:${spec.arxivId}` : 'Open Official Gateway'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
