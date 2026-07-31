import { cn } from "@/lib/utils";

export const Button = ({ className, ...props }: React.ComponentProps<"button">) => {
  return (
    <button
      {...props}
      className={cn(
        "rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200",
        "hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-50",
        className,
      )}
    />
  );
};
