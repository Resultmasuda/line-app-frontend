import LiffProvider from "@/components/LiffProvider";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden">
                <LiffProvider>
                    {children}
                </LiffProvider>
            </div>
        </div>
    );
}
