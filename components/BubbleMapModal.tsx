import { PieChart, ExternalLink } from "lucide-react";

type BubbleMapModalProps = {
    isOpen: boolean;
    onClose: () => void;
    chain: { id: string; name: string } | undefined;
    tokenAddress: string;
    tokenName: string;
};

export default function BubbleMapModal({
    isOpen,
    onClose,
    chain,
    tokenAddress,
    tokenName,
}: BubbleMapModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative border border-(--border-subtle)"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-(--border-subtle)">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <PieChart className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
                        {tokenName} Holders Map
                    </h3>
                    <div className="items-center">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div className="w-full bg-black/50" style={{ height: "70vh", minHeight: "400px" }}>
                    <iframe
                        src={`https://iframe.bubblemaps.io/map?chain=${chain?.id === "ethereum" ? "eth" : chain?.id === "arbitrum" ? "arb" : chain?.id === "polygon" ? "poly" : chain?.id === "avalanche" ? "avax" : chain?.id}&address=${tokenAddress}&partnerId=demo`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        title="Bubblemaps Token Holders"
                        style={{ display: "block" }}
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
