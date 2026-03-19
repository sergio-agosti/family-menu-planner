import * as React from "react";
import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
  buttonVariants,
} from "@/components/ui/button";

type IconPosition = "left" | "right";

export interface ButtonProps extends ShadcnButtonProps {
  icon?: React.ReactNode;
  text?: React.ReactNode;
  iconPosition?: IconPosition;
}

export function Button({
  icon,
  text,
  iconPosition = "left",
  children,
  ...props
}: ButtonProps) {
  if (children != null) {
    return <ShadcnButton {...props}>{children}</ShadcnButton>;
  }

  const iconNode = icon ? <span aria-hidden="true">{icon}</span> : null;

  return (
    <ShadcnButton {...props}>
      {iconPosition === "right" ? text : iconNode}
      {iconPosition === "right" ? iconNode : text}
    </ShadcnButton>
  );
}

export { buttonVariants };
