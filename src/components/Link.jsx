import { useCallback } from "react";

/**
 * Lightweight anchor wrapper that supports both hash routes (#/admin) and
 * in-page section anchors (#about). For section anchors we smooth-scroll.
 */
export function Link({ href, children, className = "", onClick, ...rest }) {
  const handleClick = useCallback((e) => {
    if (onClick) onClick(e);
    if (typeof href === "string" && href.startsWith("#") && !href.startsWith("#/")) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", href);
      }
    }
  }, [href, onClick]);

  return (
    <a href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}

export default Link;
