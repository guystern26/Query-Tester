import React from 'react';

export interface TutorialLaunchButtonProps {
    onClick: () => void;
}

export function TutorialLaunchButton({ onClick }: TutorialLaunchButtonProps): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-300 border border-green-500/50 rounded-lg bg-green-500/10 hover:text-white hover:border-green-400 hover:bg-green-500/20 cursor-pointer transition-colors shadow-[0_0_8px_rgba(34,197,94,0.15)]"
        >
            <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01"
                />
                <circle cx="12" cy="12" r="9.5" />
            </svg>
            Take a Tour
        </button>
    );
}
