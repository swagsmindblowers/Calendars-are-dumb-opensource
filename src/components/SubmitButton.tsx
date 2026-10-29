"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef } from "react";
import { Spinner } from "./Spinner";

type SubmitButtonProps = ComponentPropsWithoutRef<"button"> & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  className,
  pendingLabel,
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || pending}
      {...rest}
    >
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
