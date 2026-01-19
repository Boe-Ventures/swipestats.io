"use client";

import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";

type StepStatus = "complete" | "current" | "upcoming";

interface Step {
  id: string;
  name: string;
  status: StepStatus;
  href?: string;
}

interface UploadStepperProps {
  currentStep?: 1 | 2 | 3;
}

function StepCircle({
  step,
  size = "default",
}: {
  step: Step;
  size?: "default" | "small";
}) {
  const isCompleted = step.status === "complete";
  const isActive = step.status === "current";
  const sizeClasses = size === "small" ? "h-8 w-8" : "h-10 w-10";
  const dotSize = size === "small" ? "h-2 w-2" : "h-2.5 w-2.5";
  const iconSize = size === "small" ? "h-4 w-4" : "h-5 w-5";

  if (isCompleted) {
    return (
      <Link
        href={step.href ?? "#"}
        className={cn(
          sizeClasses,
          "flex flex-shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition-colors hover:bg-rose-700",
        )}
      >
        <CheckIcon className={iconSize} />
        <span className="sr-only">{step.name}</span>
      </Link>
    );
  }

  if (isActive) {
    return (
      <div
        className={cn(
          sizeClasses,
          "flex flex-shrink-0 items-center justify-center rounded-full border-2 border-rose-600 bg-white",
        )}
      >
        <span className={cn(dotSize, "rounded-full bg-rose-600")} />
        <span className="sr-only">{step.name}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses,
        "flex flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white",
      )}
    >
      <span className="sr-only">{step.name}</span>
    </div>
  );
}

export function UploadStepper({ currentStep = 1 }: UploadStepperProps) {
  const getStepStatus = (stepNumber: number): StepStatus => {
    if (stepNumber < currentStep) return "complete";
    if (stepNumber === currentStep) return "current";
    return "upcoming";
  };

  const steps: Step[] = [
    {
      id: "1",
      name: "Request your data",
      status: getStepStatus(1),
      href: "/upload",
    },
    {
      id: "2",
      name: "Upload",
      status: getStepStatus(2),
      href: undefined,
    },
    {
      id: "3",
      name: "Insights",
      status: getStepStatus(3),
      href: undefined,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.status === "current");

  return (
    <nav aria-label="Progress" className="my-4">
      {/* Mobile: Horizontal compact stepper with labels below */}
      <div className="flex flex-col items-center sm:hidden">
        {/* Circles and lines */}
        <div className="flex items-center">
          {steps.map((step, index, array) => (
            <div key={step.id} className="flex items-center">
              <StepCircle step={step} size="small" />
              {index < array.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-12",
                    index < currentStepIndex ? "bg-rose-600" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>
        {/* Labels row */}
        <div className="mt-2 flex items-start">
          {steps.map((step, index, array) => (
            <div key={step.id} className="flex items-center">
              <div className="flex w-8 justify-center">
                <span
                  className={cn(
                    "text-center text-[10px] font-medium whitespace-nowrap",
                    step.status === "current" || step.status === "complete"
                      ? "text-gray-900"
                      : "text-gray-500",
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < array.length - 1 && (
                <div className="w-12" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal stepper with more spacing */}
      <div className="hidden sm:flex sm:flex-col sm:items-center">
        {/* Circles and connecting lines row */}
        <div className="flex items-center">
          {steps.map((step, index, array) => (
            <div key={step.id} className="flex items-center">
              <StepCircle step={step} />
              {index < array.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-20",
                    index < currentStepIndex ? "bg-rose-600" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Labels row - separate from circles for proper centering */}
        <div className="mt-3 flex items-start">
          {steps.map((step, index, array) => (
            <div key={step.id} className="flex items-center">
              <div className="flex w-10 justify-center">
                <span
                  className={cn(
                    "text-center text-xs font-medium whitespace-nowrap",
                    step.status === "current" || step.status === "complete"
                      ? "text-gray-900"
                      : "text-gray-500",
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < array.length - 1 && (
                <div className="w-20" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
