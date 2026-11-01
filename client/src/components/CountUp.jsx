import { useEffect, useState } from "react";

function CountUp({ value, decimals = 0 }) {
  const target = Number(value) || 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 900;

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{n.toFixed(decimals)}</>;
}

export default CountUp;