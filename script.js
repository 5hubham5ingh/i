
const wait = async (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const snackbar = document.getElementById("snackbar");
const snackbar2 = document.getElementById("fullscreen");
const showSnackbar = async () => {
  await wait(7000)
  snackbar.className = "show";
};


const askForFullScreen = async () => {
  snackbar.className = snackbar.className.replace("show", "");
  snackbar2.className = "show";
  await wait(7000);
  snackbar2.className = snackbar2.className.replace("show", "");
};

const showFullScreen = () => {
  snackbar2.className = snackbar2.className.replace("show", "");
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
