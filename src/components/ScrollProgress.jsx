import { useScroll, useSpring } from "framer-motion";
import { motion } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"
    />
  );
}
