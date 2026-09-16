"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function MobileConnectClient({ callbackUrl }: { callbackUrl: string }) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpened(true);
      window.location.assign(callbackUrl);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [callbackUrl]);

  return (
    <div>
      <a className="primary-button" href={callbackUrl}>返回好友德扑 App</a>
      <Link className="secondary-button" href="/">留在网页版</Link>
      {opened ? <span className="sr-only" role="status">正在打开 App</span> : null}
    </div>
  );
}
