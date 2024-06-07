
const wait = async (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const snackbar = document.getElementById("snackbar");
const showSnackbar = async () => {
  await wait(7000)
  snackbar.className = "show";
};

const showFullScreen = () => {
  snackbar.className = snackbar.className.replace("show", "");
  let element = document.documentElement;
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}
showSnackbar();

document.addEventListener("DOMContentLoaded", () => {
  let options = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  }

  const getAnchorByHref = (hrefValue) => {
    return document.querySelector(`nav a[href="${hrefValue}"]`);
  }

  const sections = ["Projects", "Libraries", "Contact", "Experience", "About"];

  sections.forEach(section => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sections.forEach(sec => {
            const anchor = getAnchorByHref(`#${sec}`);
            if (sec === section) {
              anchor.classList.add("focus");
            } else {
              anchor.classList.remove("focus");
            }
          });
        }
      });
    }, options);

    const element = document.getElementById(section);
    if (element) {
      observer.observe(element);
    }
  });
});

