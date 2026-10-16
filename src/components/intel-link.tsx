import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getIntelAccess } from "@/lib/intel/fns";

export function IntelLink({
  className,
  onClick,
  label = "UBON Six Seven Intelligence",
}: {
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    void getIntelAccess().then((access) => {
      if (live) setShow(access.ok);
    });
    return () => {
      live = false;
    };
  }, []);
  if (!show) return null;
  return (
    <Link to="/intel" className={className} onClick={onClick}>
      {label}
    </Link>
  );
}
