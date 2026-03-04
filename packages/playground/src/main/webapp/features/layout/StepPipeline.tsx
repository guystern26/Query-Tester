import React from 'react';
import type { PipelineStep } from './usePipelineState';

interface StepPipelineProps {
  steps: PipelineStep[];
  activeIndex: number;
  allComplete: boolean;
  isRunning: boolean;
  onStepClick: (stepId: string) => void;
}

/* ── single step node ──────────────────────────────────────── */

function StepNode({ step, onClick }: { step: PipelineStep; onClick: () => void }) {
  let ring: string;
  let bg: string;
  let text: string;
  let extra = '';

  if (step.isComplete) {
    ring = 'border-green-500';
    bg = 'bg-green-900/40';
    text = 'text-green-400';
  } else if (step.isActive) {
    ring = 'border-accent-600';
    bg = 'bg-accent-900';
    text = 'text-accent-400';
    extra = 'animate-pipelinePulse';
  } else {
    ring = 'border-slate-600';
    bg = 'bg-navy-800/60';
    text = 'text-slate-500';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 group shrink-0 focus:outline-none`}
    >
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${ring} ${bg} ${text} ${extra} transition-colors duration-200 group-hover:brightness-110`}
      >
        {step.isComplete ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step.number
        )}
      </span>
      <span className={`text-[10px] font-medium tracking-wide ${step.isComplete ? 'text-green-400/80' : step.isActive ? 'text-accent-400/80' : 'text-slate-500'}`}>
        {step.label}
      </span>
    </button>
  );
}

/* ── pipe between steps ────────────────────────────────────── */

function Pipe({ leftComplete, rightActive, isRunning }: { leftComplete: boolean; rightActive: boolean; isRunning: boolean }) {
  const filled = leftComplete;
  return (
    <div className="flex-1 h-9 flex items-center mx-1 relative min-w-[32px]">
      {/* track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-slate-700 rounded-full" />
      {/* fill */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all duration-500 ease-out ${filled ? 'bg-green-500' : 'bg-slate-700'}`}
        style={{ width: filled ? '100%' : '0%' }}
      />
      {/* traveling ball: show when left is complete but right isn't yet */}
      {leftComplete && rightActive && !isRunning && (
        <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent-400 rounded-full animate-travelRight opacity-80" />
      )}
      {/* run sweep ball */}
      {isRunning && (
        <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent-400 rounded-full animate-runSweep opacity-80" />
      )}
    </div>
  );
}

/* ── pipeline bar ──────────────────────────────────────────── */

export function StepPipeline({ steps, activeIndex, allComplete, isRunning, onStepClick }: StepPipelineProps) {
  return (
    <div className="flex items-start px-8 py-3">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <StepNode step={step} onClick={() => onStepClick(step.id)} />
          {i < steps.length - 1 && (
            <Pipe
              leftComplete={step.isComplete}
              rightActive={steps[i + 1].isActive}
              isRunning={isRunning}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
