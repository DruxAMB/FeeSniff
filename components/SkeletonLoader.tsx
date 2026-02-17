export default function SkeletonLoader() {
    return (
        <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-in">
            {/* Token header skeleton */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 w-40 rounded shimmer" />
                        <div className="h-4 w-64 rounded shimmer" />
                    </div>
                </div>
            </div>

            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-5">
                        <div className="h-3 w-20 rounded shimmer mb-3" />
                        <div className="h-7 w-28 rounded shimmer" />
                    </div>
                ))}
            </div>

            {/* Fee wallets skeleton */}
            <div className="glass-card p-6">
                <div className="h-4 w-32 rounded shimmer mb-4" />
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-24 rounded shimmer" />
                            <div className="h-4 flex-1 rounded shimmer" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions skeleton */}
            <div className="glass-card p-6">
                <div className="h-4 w-40 rounded shimmer mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-20 rounded shimmer" />
                            <div className="h-4 flex-1 rounded shimmer" />
                            <div className="h-4 w-16 rounded shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
