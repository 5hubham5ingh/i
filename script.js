
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
