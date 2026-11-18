import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";

export function PdsPersonPlusIcon() {
  return (
    <span className="relative grid size-12 place-items-center">
      <UserIcon aria-hidden="true" className="size-10 stroke-[1.75]" />
      <span className="absolute -bottom-0.5 -right-1 grid size-6 place-items-center rounded-full bg-primary text-on-primary">
        <PlusIcon aria-hidden="true" className="size-4 stroke-[2.5]" />
      </span>
    </span>
  );
}
