import React from 'react';

interface PipelineConnectorProps {
  leftComplete: boolean;
}

export function PipelineConnector({ leftComplete }: PipelineConnectorProps) {
  const lineColor = leftComplete ? 'from-transparent via-green-500 to-transparent' : 'from-transparent via-slate-600 to-transparent';
  const ballColor = leftComplete ? 'bg-green-500' : 'bg-slate-600';

  return (
    <div className="w-6 shrink-0 flex flex-col items-center justify-center relative mx-1" aria-hidden="true">
      {/* vertical pipe */}
      <div className={`absolute inset-x-0 top-4 bottom-4 mx-auto w-[3px] bg-gradient-to-b ${lineColor} rounded-full`} />

      {/* center node */}
      <div className={`w-3 h-3 rounded-full ${ballColor} z-10 transition-colors duration-300`} />

      {/* animated particle */}
      {leftComplete && (
        <div className="absolute inset-x-0 top-4 bottom-4 mx-auto w-[3px] overflow-hidden pointer-events-none">
          <div className="absolute w-[3px] h-3 bg-blue-300 rounded-full animate-flowDown opacity-70" />
        </div>
      )}
    </div>
  );
}
