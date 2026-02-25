"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-[#737373]">
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          const href = `/${paths.slice(0, index + 1).join("/")}`;
          const title = path.charAt(0).toUpperCase() + path.slice(1);

          return (
            <Fragment key={path}>
              <li>
                {isLast ? (
                  <span className="font-medium text-[#F5F5F5]">{title}</span>
                ) : (
                  <Link href={href} className="hover:text-[#F5F5F5] transition-colors">
                    {title}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true">
                  <ChevronRight className="h-4 w-4" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
