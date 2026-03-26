import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ListCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-36" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Skeleton className="h-5 flex-1 sm:max-w-[60%]" />
              <div className="flex shrink-0 gap-2 sm:justify-end">
                <Skeleton className="h-9 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
