import { useEffect } from "react";
import { useLocation } from "react-router";

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => {
        const element = document.getElementById(
          decodeURIComponent(hash.slice(1)),
        );

        if (element) {
          element.scrollIntoView({
            behavior: "auto",
            block: "start",
          });
        }
      });

      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname, search, hash]);

  return null;
}

export default ScrollToTop;
